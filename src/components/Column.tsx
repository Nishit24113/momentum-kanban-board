import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard'
import type { Label, Task, TaskStatus, TeamMember } from '../types/task'

interface ColumnProps {
  id: TaskStatus
  title: string
  description: string
  tasks: Task[]
  teamMembers: TeamMember[]
  labels: Label[]
  taskLabelMap: Record<string, string[]>
  onCreate: (status: TaskStatus) => void
  onOpen: (task: Task) => void
}

export default function Column({ id, title, description, tasks, teamMembers, labels, taskLabelMap, onCreate, onOpen }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${id}` })

  return (
    <section ref={setNodeRef} className={`board-column ${isOver ? 'board-column-over' : ''}`}>
      <header className="column-header">
        <div>
          <div className="column-title-row">
            <span className={`column-dot column-dot-${id}`} />
            <h2>{title}</h2>
            <span className="column-count">{tasks.length}</span>
          </div>
          <p>{description}</p>
        </div>
        <button className="icon-button" type="button" onClick={() => onCreate(id)} aria-label={`Add task to ${title}`}>
          <Plus size={17} />
        </button>
      </header>

      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              teamMembers={teamMembers}
              labels={labels}
              taskLabels={taskLabelMap[task.id] ?? []}
              onOpen={onOpen}
            />
          ))}
          {tasks.length === 0 && (
            <button className="empty-state" type="button" onClick={() => onCreate(id)}>
              <span className="empty-state-icon">+</span>
              <strong>No tasks here</strong>
              <span>Add a task or drop one into this column.</span>
            </button>
          )}
        </div>
      </SortableContext>
    </section>
  )
}
