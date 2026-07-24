import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ListFilter,
  Plus,
  Search,
  Sparkles,
  Tag,
  Users,
  X,
} from 'lucide-react'
import Column from './components/Column'
import TaskCard from './components/TaskCard'
import TaskModal from './components/TaskModal'
import TeamPanel from './components/TeamPanel'
import LabelPanel from './components/LabelPanel'
import {
  createTask, deleteTask, fetchTasks, updateTask, logActivity,
  fetchTeamMembers, fetchLabels, fetchTaskLabels, setTaskLabels,
} from './lib/tasks'
import { hasSupabaseConfig, supabase } from './lib/supabase'
import {
  COLUMNS, type Label, type Task, type TaskDraft, type TaskPriority,
  type TaskStatus, type TeamMember,
} from './types/task'

interface ModalState {
  mode: 'create' | 'edit'
  initialStatus: TaskStatus
  task: Task | null
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) return left.status.localeCompare(right.status)
    if (left.position !== right.position) return left.position - right.position
    return new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  })
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [taskLabelMap, setTaskLabelMap] = useState<Record<string, string[]>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [fatalError, setFatalError] = useState('')
  const [toast, setToast] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState<'all' | TaskPriority>('all')
  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const [showLabelPanel, setShowLabelPanel] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const loadTaskLabels = useCallback(async (taskList: Task[]) => {
    const map: Record<string, string[]> = {}
    const results = await Promise.all(
      taskList.map(async (t) => ({ id: t.id, labels: await fetchTaskLabels(t.id) }))
    )
    results.forEach((r) => { map[r.id] = r.labels })
    setTaskLabelMap(map)
  }, [])

  useEffect(() => {
    let mounted = true

    async function initialize() {
      if (!hasSupabaseConfig) {
        setFatalError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.')
        setLoading(false)
        return
      }

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.warn('Session retrieval failed, attempting fresh sign-in:', sessionError.message)
        }

        let session = sessionData?.session
        if (!session) {
          const { data, error } = await supabase.auth.signInAnonymously()
          if (error) throw new Error(`Authentication failed: ${error.message}`)
          session = data.session
        }

        if (!session?.user?.id) throw new Error('Could not create the guest session. Ensure anonymous sign-ins are enabled in Supabase Auth settings.')

        const [loadedTasks, loadedMembers, loadedLabels] = await Promise.all([
          fetchTasks(),
          fetchTeamMembers(),
          fetchLabels(),
        ])

        if (mounted) {
          setUserId(session.user.id)
          setTasks(sortTasks(loadedTasks))
          setTeamMembers(loadedMembers)
          setLabels(loadedLabels)
          void loadTaskLabels(loadedTasks)
        }
      } catch (error) {
        if (mounted) {
          const message = error instanceof Error ? error.message : 'Unable to load the board.'
          console.error('Board initialization error:', message)
          setFatalError(message)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void initialize()
    return () => { mounted = false }
  }, [loadTaskLabels])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return tasks.filter((task) => {
      const matchesQuery = !normalizedQuery || task.title.toLowerCase().includes(normalizedQuery) ||
        (task.description ?? '').toLowerCase().includes(normalizedQuery)
      const matchesPriority = priority === 'all' || task.priority === priority
      const matchesLabel = labelFilter === 'all' ||
        (taskLabelMap[task.id] ?? []).includes(labelFilter)
      return matchesQuery && matchesPriority && matchesLabel
    })
  }, [tasks, query, priority, labelFilter, taskLabelMap])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = tasks.filter((task) => {
      if (!task.due_date || task.status === 'done') return false
      return new Date(`${task.due_date}T00:00:00`) < today
    }).length
    return {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === 'done').length,
      active: tasks.filter((task) => task.status === 'in_progress').length,
      overdue,
    }
  }, [tasks])

  async function handleSaveTask(draft: TaskDraft) {
    if (!userId) return
    setBusy(true)
    try {
      if (modal?.mode === 'edit' && modal.task) {
        const oldTask = modal.task
        const updated = await updateTask(modal.task.id, {
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          status: draft.status,
          priority: draft.priority,
          due_date: draft.due_date || null,
          assignee_id: draft.assignee_id || null,
        })

        await setTaskLabels(updated.id, draft.label_ids)
        setTaskLabelMap((prev) => ({ ...prev, [updated.id]: draft.label_ids }))

        if (oldTask.status !== draft.status) {
          const fromCol = COLUMNS.find((c) => c.id === oldTask.status)?.title ?? oldTask.status
          const toCol = COLUMNS.find((c) => c.id === draft.status)?.title ?? draft.status
          await logActivity(updated.id, 'status_change', `Moved from ${fromCol} to ${toCol}`)
        }
        if (oldTask.title !== draft.title.trim()) {
          await logActivity(updated.id, 'edited', `Title changed to "${draft.title.trim()}"`)
        }
        if (oldTask.assignee_id !== (draft.assignee_id || null)) {
          const member = teamMembers.find((m) => m.id === draft.assignee_id)
          await logActivity(updated.id, 'assigned', member ? `Assigned to ${member.name}` : 'Unassigned')
        }

        setTasks((current) => sortTasks(current.map((task) => task.id === updated.id ? updated : task)))
        setToast('Task updated successfully.')
      } else {
        const created = await createTask(userId, draft)
        setTaskLabelMap((prev) => ({ ...prev, [created.id]: draft.label_ids }))
        setTasks((current) => sortTasks([...current, created]))
        setToast('Task created successfully.')
      }
      setModal(null)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to save the task.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteTask() {
    if (!modal?.task) return
    const confirmed = window.confirm(`Delete "${modal.task.title}"? This cannot be undone.`)
    if (!confirmed) return

    setBusy(true)
    try {
      await deleteTask(modal.task.id)
      setTasks((current) => current.filter((task) => task.id !== modal.task?.id))
      setModal(null)
      setToast('Task deleted.')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to delete the task.')
    } finally {
      setBusy(false)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((item) => item.id === String(event.active.id)) ?? null
    setActiveTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || activeId === overId) return

    const task = tasks.find((item) => item.id === activeId)
    if (!task) return

    const destinationStatus = overId.startsWith('column:')
      ? overId.replace('column:', '') as TaskStatus
      : tasks.find((item) => item.id === overId)?.status
    if (!destinationStatus) return

    const originalTasks = tasks
    const destinationTasks = tasks
      .filter((item) => item.status === destinationStatus && item.id !== activeId)
      .sort((left, right) => left.position - right.position)

    const targetIndex = overId.startsWith('column:')
      ? destinationTasks.length
      : Math.max(0, destinationTasks.findIndex((item) => item.id === overId))

    let nextPosition = 1000
    if (destinationTasks.length === 0) {
      nextPosition = 1000
    } else if (targetIndex <= 0) {
      nextPosition = destinationTasks[0].position - 1000
    } else if (targetIndex >= destinationTasks.length) {
      nextPosition = destinationTasks[destinationTasks.length - 1].position + 1000
    } else {
      nextPosition = (destinationTasks[targetIndex - 1].position + destinationTasks[targetIndex].position) / 2
    }

    const optimisticTask = { ...task, status: destinationStatus, position: nextPosition }
    setTasks(sortTasks(tasks.map((item) => item.id === activeId ? optimisticTask : item)))

    try {
      const saved = await updateTask(activeId, { status: destinationStatus, position: nextPosition })
      setTasks((current) => sortTasks(current.map((item) => item.id === activeId ? saved : item)))

      if (task.status !== destinationStatus) {
        const fromCol = COLUMNS.find((c) => c.id === task.status)?.title ?? task.status
        const toCol = COLUMNS.find((c) => c.id === destinationStatus)?.title ?? destinationStatus
        await logActivity(activeId, 'status_change', `Moved from ${fromCol} to ${toCol}`)
      }

      setToast(`Moved to ${COLUMNS.find((column) => column.id === destinationStatus)?.title}.`)
    } catch (error) {
      setTasks(originalTasks)
      setToast(error instanceof Error ? error.message : 'Move failed. The board was restored.')
    }
  }

  if (loading) {
    return (
      <main className="app-shell loading-shell">
        <div className="brand-mark"><Sparkles size={20} /></div>
        <div className="loading-copy">
          <strong>Preparing your workspace</strong>
          <span>Creating a secure guest session and loading tasks...</span>
        </div>
        <div className="loading-bar"><span /></div>
      </main>
    )
  }

  if (fatalError) {
    return (
      <main className="app-shell error-shell">
        <div className="error-panel">
          <AlertTriangle size={28} />
          <h1>Board setup needs attention</h1>
          <p>{fatalError}</p>
          <p className="error-hint">Confirm anonymous sign-ins are enabled, run the SQL schema, and restart the app.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <div>
            <span className="eyebrow">Personal workspace</span>
            <h1>Momentum Board</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="button button-secondary" type="button" onClick={() => setShowTeamPanel(true)}>
            <Users size={16} /> Team
          </button>
          <button className="button button-secondary" type="button" onClick={() => setShowLabelPanel(true)}>
            <Tag size={16} /> Labels
          </button>
          <button className="button button-primary" type="button" onClick={() => setModal({ mode: 'create', initialStatus: 'todo', task: null })}>
            <Plus size={17} /> New task
          </button>
        </div>
      </header>

      <section className="hero-row">
        <div>
          <span className="eyebrow">Today's focus</span>
          <h2>Move meaningful work forward.</h2>
          <p>Plan, prioritize, and finish tasks in one calm, focused workspace.</p>
        </div>
        <div className="session-chip"><CircleDot size={14} /> Private guest session</div>
      </section>

      <section className="stats-grid" aria-label="Board summary">
        <div className="stat-card"><span>Total tasks</span><strong>{stats.total}</strong></div>
        <div className="stat-card"><span>In progress</span><strong>{stats.active}</strong></div>
        <div className="stat-card"><span>Completed</span><strong>{stats.completed}</strong></div>
        <div className={`stat-card ${stats.overdue ? 'stat-card-alert' : ''}`}><span>Overdue</span><strong>{stats.overdue}</strong></div>
      </section>

      <section className="toolbar" aria-label="Task filters">
        <div className="search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks..." aria-label="Search tasks" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}
        </div>
        <div className="filter-field">
          <ListFilter size={17} />
          <select value={priority} onChange={(event) => setPriority(event.target.value as 'all' | TaskPriority)} aria-label="Filter by priority">
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="normal">Normal priority</option>
            <option value="low">Low priority</option>
          </select>
        </div>
        {labels.length > 0 && (
          <div className="filter-field">
            <Tag size={15} />
            <select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)} aria-label="Filter by label">
              <option value="all">All labels</option>
              {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
        {(query || priority !== 'all' || labelFilter !== 'all') && (
          <button className="clear-filter" type="button" onClick={() => { setQuery(''); setPriority('all'); setLabelFilter('all') }}>
            Clear filters
          </button>
        )}
        <span className="result-count">{visibleTasks.length} shown</span>
      </section>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <section className="board-grid" aria-label="Kanban task board">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              description={column.description}
              tasks={visibleTasks.filter((task) => task.status === column.id)}
              teamMembers={teamMembers}
              labels={labels}
              taskLabelMap={taskLabelMap}
              onCreate={(status) => setModal({ mode: 'create', initialStatus: status, task: null })}
              onOpen={(task) => setModal({ mode: 'edit', initialStatus: task.status, task })}
            />
          ))}
        </section>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} teamMembers={teamMembers} labels={labels} taskLabels={taskLabelMap[activeTask.id] ?? []} onOpen={() => undefined} overlay /> : null}
        </DragOverlay>
      </DndContext>

      <footer className="app-footer">
        <span><CheckCircle2 size={15} /> Changes persist securely to Supabase</span>
        <span>Guest ID: {userId?.slice(0, 8)}</span>
      </footer>

      {modal && (
        <TaskModal
          mode={modal.mode}
          initialStatus={modal.initialStatus}
          task={modal.task}
          busy={busy}
          teamMembers={teamMembers}
          labels={labels}
          taskLabels={modal.task ? (taskLabelMap[modal.task.id] ?? []) : []}
          onClose={() => !busy && setModal(null)}
          onSave={handleSaveTask}
          onDelete={modal.mode === 'edit' ? handleDeleteTask : undefined}
        />
      )}

      {showTeamPanel && (
        <TeamPanel
          userId={userId!}
          members={teamMembers}
          onUpdate={setTeamMembers}
          onClose={() => setShowTeamPanel(false)}
        />
      )}

      {showLabelPanel && (
        <LabelPanel
          userId={userId!}
          labels={labels}
          onUpdate={setLabels}
          onClose={() => setShowLabelPanel(false)}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

export default App
