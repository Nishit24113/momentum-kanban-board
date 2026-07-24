import { useMemo } from 'react'
import { BarChart3, Clock, Flame, TrendingUp, X, Zap } from 'lucide-react'
import type { Task } from '../types/task'
import { COLUMNS } from '../types/task'

interface InsightsPanelProps {
  tasks: Task[]
  onClose: () => void
}

function getCompletionRate(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100)
}

function getAverageAge(tasks: Task[]): string {
  const activeTasks = tasks.filter((t) => t.status !== 'done')
  if (activeTasks.length === 0) return '0d'
  const now = Date.now()
  const totalDays = activeTasks.reduce((sum, t) => {
    const age = (now - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return sum + age
  }, 0)
  const avg = totalDays / activeTasks.length
  if (avg < 1) return '<1d'
  return `${Math.round(avg)}d`
}

function getPriorityBreakdown(tasks: Task[]) {
  const high = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length
  const normal = tasks.filter((t) => t.priority === 'normal' && t.status !== 'done').length
  const low = tasks.filter((t) => t.priority === 'low' && t.status !== 'done').length
  return { high, normal, low }
}

function getColumnDistribution(tasks: Task[]) {
  return COLUMNS.map((col) => ({
    id: col.id,
    title: col.title,
    count: tasks.filter((t) => t.status === col.id).length,
  }))
}

function getOverdueTasks(tasks: Task[]): Task[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return tasks.filter((t) => {
    if (!t.due_date || t.status === 'done') return false
    return new Date(`${t.due_date}T00:00:00`) < today
  })
}

function getUpcomingDeadlines(tasks: Task[]): Task[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  return tasks
    .filter((t) => {
      if (!t.due_date || t.status === 'done') return false
      const due = new Date(`${t.due_date}T00:00:00`)
      return due >= today && due <= nextWeek
    })
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
}

export default function InsightsPanel({ tasks, onClose }: InsightsPanelProps) {
  const completionRate = useMemo(() => getCompletionRate(tasks), [tasks])
  const avgAge = useMemo(() => getAverageAge(tasks), [tasks])
  const priorityBreakdown = useMemo(() => getPriorityBreakdown(tasks), [tasks])
  const distribution = useMemo(() => getColumnDistribution(tasks), [tasks])
  const overdue = useMemo(() => getOverdueTasks(tasks), [tasks])
  const upcoming = useMemo(() => getUpcomingDeadlines(tasks), [tasks])
  const maxColCount = Math.max(...distribution.map((d) => d.count), 1)

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card insights-panel" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Analytics</span>
            <h2><BarChart3 size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Board Insights</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close insights">
            <X size={18} />
          </button>
        </div>

        <div className="insights-content">
          <div className="insights-kpi-row">
            <div className="insights-kpi">
              <div className="insights-kpi-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <strong>{completionRate}%</strong>
                <span>Completion</span>
              </div>
            </div>
            <div className="insights-kpi">
              <div className="insights-kpi-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                <Clock size={18} />
              </div>
              <div>
                <strong>{avgAge}</strong>
                <span>Avg task age</span>
              </div>
            </div>
            <div className="insights-kpi">
              <div className="insights-kpi-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                <Flame size={18} />
              </div>
              <div>
                <strong>{priorityBreakdown.high}</strong>
                <span>High priority</span>
              </div>
            </div>
            <div className="insights-kpi">
              <div className="insights-kpi-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                <Zap size={18} />
              </div>
              <div>
                <strong>{tasks.filter((t) => t.status === 'done').length}</strong>
                <span>Completed</span>
              </div>
            </div>
          </div>

          <div className="insights-section">
            <h3>Column Distribution</h3>
            <div className="insights-bars">
              {distribution.map((col) => (
                <div key={col.id} className="insights-bar-row">
                  <span className="insights-bar-label">{col.title}</span>
                  <div className="insights-bar-track">
                    <div
                      className="insights-bar-fill"
                      style={{ width: `${(col.count / maxColCount) * 100}%` }}
                    />
                  </div>
                  <span className="insights-bar-count">{col.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="insights-section">
            <h3>Priority Breakdown</h3>
            <div className="insights-priority-grid">
              <div className="insights-priority-item priority-high-bg">
                <strong>{priorityBreakdown.high}</strong>
                <span>High</span>
              </div>
              <div className="insights-priority-item priority-normal-bg">
                <strong>{priorityBreakdown.normal}</strong>
                <span>Normal</span>
              </div>
              <div className="insights-priority-item priority-low-bg">
                <strong>{priorityBreakdown.low}</strong>
                <span>Low</span>
              </div>
            </div>
          </div>

          {overdue.length > 0 && (
            <div className="insights-section insights-section-alert">
              <h3><Flame size={15} /> Overdue Tasks ({overdue.length})</h3>
              <ul className="insights-task-list">
                {overdue.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <span className="insights-task-title">{t.title}</span>
                    <span className="insights-task-due overdue">Due {t.due_date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="insights-section">
              <h3><Clock size={15} /> Upcoming Deadlines</h3>
              <ul className="insights-task-list">
                {upcoming.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <span className="insights-task-title">{t.title}</span>
                    <span className="insights-task-due">{t.due_date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tasks.length === 0 && (
            <div className="insights-empty">
              <p>Create some tasks to see insights and analytics here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
