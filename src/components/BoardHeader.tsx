import { CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

interface BoardHeaderProps {
  stats: {
    total: number
    completed: number
    active: number
    overdue: number
  }
}

function getProductivityMessage(stats: BoardHeaderProps['stats']): string {
  if (stats.total === 0) return 'Start by adding your first task.'
  if (stats.overdue > 0) return `${stats.overdue} task${stats.overdue > 1 ? 's' : ''} need${stats.overdue === 1 ? 's' : ''} attention — overdue.`
  if (stats.completed === stats.total) return 'All tasks completed. Great work!'
  if (stats.active > 0) return `${stats.active} task${stats.active > 1 ? 's' : ''} in progress. Keep the momentum.`
  return 'Plan, prioritize, and finish tasks in one calm, focused workspace.'
}

export default function BoardHeader({ stats }: BoardHeaderProps) {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <section className="board-header-section">
      <div className="board-header-content">
        <div className="board-header-left">
          <span className="eyebrow">Today's focus</span>
          <h2>Move meaningful work forward.</h2>
          <p className="board-header-message">{getProductivityMessage(stats)}</p>
        </div>
        {stats.total > 0 && (
          <div className="board-header-progress">
            <div className="progress-ring-wrapper">
              <svg className="progress-ring" viewBox="0 0 60 60">
                <circle className="progress-ring-bg" cx="30" cy="30" r="24" />
                <circle
                  className="progress-ring-fill"
                  cx="30" cy="30" r="24"
                  strokeDasharray={`${(completionRate / 100) * 150.8} 150.8`}
                />
              </svg>
              <span className="progress-ring-text">{completionRate}%</span>
            </div>
            <span className="progress-label">Complete</span>
          </div>
        )}
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-total"><TrendingUp size={15} /></div>
          <div className="stat-info"><span>Total</span><strong>{stats.total}</strong></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-active"><Clock size={15} /></div>
          <div className="stat-info"><span>Active</span><strong>{stats.active}</strong></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-done"><CheckCircle2 size={15} /></div>
          <div className="stat-info"><span>Done</span><strong>{stats.completed}</strong></div>
        </div>
        <div className={`stat-card ${stats.overdue ? 'stat-card-alert' : ''}`}>
          <div className="stat-icon stat-icon-overdue"><AlertTriangle size={15} /></div>
          <div className="stat-info"><span>Overdue</span><strong>{stats.overdue}</strong></div>
        </div>
      </div>
    </section>
  )
}
