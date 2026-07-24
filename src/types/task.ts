export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  position: number
  assignee_id: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface TaskDraft {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  assignee_id: string
  label_ids: string[]
}

export interface TeamMember {
  id: string
  name: string
  color: string
  avatar_url: string | null
  user_id: string
  created_at: string
}

export interface Label {
  id: string
  name: string
  color: string
  user_id: string
  created_at: string
}

export interface Comment {
  id: string
  task_id: string
  content: string
  user_id: string
  created_at: string
}

export interface ActivityEntry {
  id: string
  task_id: string
  action: string
  details: string | null
  user_id: string
  created_at: string
}

export const COLUMNS: Array<{
  id: TaskStatus
  title: string
  description: string
}> = [
  { id: 'todo', title: 'To Do', description: 'Ideas ready to start' },
  { id: 'in_progress', title: 'In Progress', description: 'Work currently moving' },
  { id: 'in_review', title: 'In Review', description: 'Ready for a final pass' },
  { id: 'done', title: 'Done', description: 'Completed outcomes' },
]

export const LABEL_COLORS = [
  '#5b55e7', '#24a47f', '#ec9a35', '#e54d6b',
  '#3b82f6', '#8b5cf6', '#06b6d4', '#84cc16',
]
