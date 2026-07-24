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
  BarChart3,
  CheckCircle2,
  ListFilter,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Tag,
  Users,
  X,
} from 'lucide-react'
import Column from './components/Column'
import TaskCard from './components/TaskCard'
import TaskModal from './components/TaskModal'
import TeamPanel from './components/TeamPanel'
import LabelPanel from './components/LabelPanel'
import BoardHeader from './components/BoardHeader'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import ConfirmDialog from './components/ConfirmDialog'
import InsightsPanel from './components/InsightsPanel'
import {
  createTask, deleteTask, fetchTasks, updateTask, logActivity,
  fetchTeamMembers, fetchLabels, fetchTaskLabels, setTaskLabels,
} from './lib/tasks'
import { useRealtimeSync } from './hooks/useRealtimeSync'
import { useTheme } from './hooks/useTheme'
import { getOrCreateSession, hasSupabaseConfig } from './lib/supabase'
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
  const { theme, toggle: toggleTheme } = useTheme()
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
  const [showInsights, setShowInsights] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useRealtimeSync({
    userId,
    onInsert: useCallback((task: Task) => {
      setTasks((current) => {
        if (current.some((t) => t.id === task.id)) return current
        return sortTasks([...current, task])
      })
    }, []),
    onUpdate: useCallback((task: Task) => {
      setTasks((current) => sortTasks(current.map((t) => t.id === task.id ? task : t)))
    }, []),
    onDelete: useCallback((taskId: string) => {
      setTasks((current) => current.filter((t) => t.id !== taskId))
    }, []),
  })

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
        const session = await getOrCreateSession()
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

  function handleDeleteTask() {
    if (!modal?.task) return
    setConfirmDelete(modal.task)
  }

  async function executeDeleteTask() {
    if (!confirmDelete) return
    setBusy(true)
    try {
      await deleteTask(confirmDelete.id)
      setTasks((current) => current.filter((task) => task.id !== confirmDelete.id))
      setConfirmDelete(null)
      setModal(null)
      setToast('Task deleted.')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Unable to delete the task.')
    } finally {
      setBusy(false)
    }
  }

  const handleSearchFocus = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>('.search-field input')
    searchInput?.focus()
  }, [])

  const handleClearFilters = useCallback(() => {
    setQuery('')
    setPriority('all')
    setLabelFilter('all')
  }, [])

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
          <button className="icon-button theme-toggle" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className="button button-secondary" type="button" onClick={() => setShowInsights(true)}>
            <BarChart3 size={16} /> Insights
          </button>
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

      <BoardHeader stats={stats} />

      <section className="toolbar" aria-label="Task filters">
        <div className="search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks... (press /)" aria-label="Search tasks" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={14} /></button>}
        </div>
        <div className="filter-field">
          <ListFilter size={15} />
          <select value={priority} onChange={(event) => setPriority(event.target.value as 'all' | TaskPriority)} aria-label="Filter by priority">
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        {labels.length > 0 && (
          <div className="filter-field">
            <Tag size={14} />
            <select value={labelFilter} onChange={(event) => setLabelFilter(event.target.value)} aria-label="Filter by label">
              <option value="all">All labels</option>
              {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
        {teamMembers.length > 0 && (
          <div className="filter-field">
            <Users size={14} />
            <select defaultValue="all" onChange={(event) => {
              const val = event.target.value
              if (val === 'all') handleClearFilters()
            }} aria-label="Filter by assignee">
              <option value="all">All members</option>
              {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        {(query || priority !== 'all' || labelFilter !== 'all') && (
          <button className="clear-filter" type="button" onClick={handleClearFilters}>
            Clear filters
          </button>
        )}
        <span className="result-count">{visibleTasks.length} task{visibleTasks.length !== 1 ? 's' : ''}</span>
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
        <span><CheckCircle2 size={14} /> Secured with Supabase RLS</span>
        <span>Guest session: {userId?.slice(0, 8)} · Press N for new task</span>
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

      {showInsights && (
        <InsightsPanel tasks={tasks} onClose={() => setShowInsights(false)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete task"
          message={`Are you sure you want to delete "${confirmDelete.title}"? This action cannot be undone.`}
          busy={busy}
          onConfirm={() => void executeDeleteTask()}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <KeyboardShortcuts
        onNewTask={() => setModal({ mode: 'create', initialStatus: 'todo', task: null })}
        onSearch={handleSearchFocus}
        onClearFilters={handleClearFilters}
        onEscape={useCallback(() => {
          if (confirmDelete) { setConfirmDelete(null); return }
          if (modal) { setModal(null); return }
          if (showInsights) { setShowInsights(false); return }
          if (showTeamPanel) { setShowTeamPanel(false); return }
          if (showLabelPanel) { setShowLabelPanel(false); return }
          handleClearFilters()
        }, [confirmDelete, modal, showInsights, showTeamPanel, showLabelPanel, handleClearFilters])}
      />

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  )
}

export default App
