import { useMemo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, GripVertical } from 'lucide-react'
import type { Label, Task, TeamMember } from '../types/task'

interface TaskCardProps {
  task: Task
  teamMembers: TeamMember[]
  labels: Label[]
  taskLabels: string[]
  onOpen: (task: Task) => void
  overlay?: boolean
}

function getDueState(dueDate: string | null) {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(`${dueDate}T00:00:00`)
  const difference = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)

  if (difference < 0) return { label: 'Overdue', className: 'due-overdue' }
  if (difference === 0) return { label: 'Due today', className: 'due-today' }
  if (difference <= 3) return { label: `${difference}d left`, className: 'due-soon' }
  return {
    label: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    className: 'due-default',
  }
}

export default function TaskCard({ task, teamMembers, labels, taskLabels, onOpen, overlay = false }: TaskCardProps) {
  const dueState = useMemo(() => getDueState(task.due_date), [task.due_date])
  const assignee = useMemo(() => teamMembers.find((m) => m.id === task.assignee_id), [teamMembers, task.assignee_id])
  const cardLabels = useMemo(() => labels.filter((l) => taskLabels.includes(l.id)), [labels, taskLabels])
  const sortable = useSortable({ id: task.id, disabled: overlay })
  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }

  return (
    <article
      ref={overlay ? undefined : sortable.setNodeRef}
      style={style}
      className={`task-card ${sortable.isDragging ? 'task-card-dragging' : ''} ${overlay ? 'task-card-overlay' : ''}`}
      onClick={() => onOpen(task)}
    >
      <div className="task-card-topline">
        <span className={`priority-pill priority-${task.priority}`}>{task.priority}</span>
        <button
          className="drag-handle"
          type="button"
          aria-label={`Drag ${task.title}`}
          onClick={(event) => event.stopPropagation()}
          {...(overlay ? {} : sortable.attributes)}
          {...(overlay ? {} : sortable.listeners)}
        >
          <GripVertical size={16} />
        </button>
      </div>

      {cardLabels.length > 0 && (
        <div className="task-labels">
          {cardLabels.map((l) => (
            <span key={l.id} className="task-label-chip" style={{ background: l.color + '20', color: l.color }}>
              {l.name}
            </span>
          ))}
        </div>
      )}

      <h3>{task.title}</h3>
      {task.description && <p className="task-description">{task.description}</p>}

      <div className="task-card-footer">
        <div className="task-footer-left">
          {dueState ? (
            <span className={`due-pill ${dueState.className}`}>
              <CalendarDays size={14} />
              {dueState.label}
            </span>
          ) : (
            <span className="no-date">No due date</span>
          )}
        </div>
        <div className="task-footer-right">
          {assignee && (
            <span className="assignee-chip" style={{ background: assignee.color + '20', borderColor: assignee.color }}>
              <span className="assignee-avatar" style={{ background: assignee.color }}>
                {assignee.name.charAt(0).toUpperCase()}
              </span>
            </span>
          )}
          <span className="task-id">#{task.id.slice(0, 4).toUpperCase()}</span>
        </div>
      </div>
    </article>
  )
}
