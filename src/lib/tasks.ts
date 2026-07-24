import { supabase } from './supabase'
import type { ActivityEntry, Comment, Label, Task, TaskDraft, TeamMember } from '../types/task'

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Fetch failed: ${error.message}`)
  return (data ?? []) as Task[]
}

export async function createTask(userId: string, draft: TaskDraft): Promise<Task> {
  const { data: maxPositionRow, error: positionError } = await supabase
    .from('tasks')
    .select('position')
    .eq('status', draft.status)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (positionError) throw new Error(`Position query failed: ${positionError.message}`)

  const position = Number(maxPositionRow?.position ?? 0) + 1000
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      priority: draft.priority,
      due_date: draft.due_date || null,
      assignee_id: draft.assignee_id || null,
      position,
      user_id: userId,
    })
    .select('*')
    .single()

  if (error) throw new Error(`Create failed: ${error.message}`)

  if (draft.label_ids.length > 0) {
    await supabase.from('task_labels').insert(
      draft.label_ids.map((label_id) => ({ task_id: data.id, label_id }))
    )
  }

  await logActivity(data.id, 'created', `Created task "${draft.title.trim()}"`)
  return data as Task
}

export async function updateTask(
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'due_date' | 'position' | 'assignee_id'>>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select('*')
    .single()

  if (error) throw new Error(`Update failed: ${error.message}`)
  return data as Task
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw new Error(`Delete failed: ${error.message}`)
}

// Team Members
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Fetch team failed: ${error.message}`)
  return (data ?? []) as TeamMember[]
}

export async function createTeamMember(userId: string, name: string, color: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ name: name.trim(), color, user_id: userId })
    .select('*')
    .single()

  if (error) throw new Error(`Create member failed: ${error.message}`)
  return data as TeamMember
}

export async function deleteTeamMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('id', memberId)
  if (error) throw new Error(`Delete member failed: ${error.message}`)
}

// Labels
export async function fetchLabels(): Promise<Label[]> {
  const { data, error } = await supabase
    .from('labels')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Fetch labels failed: ${error.message}`)
  return (data ?? []) as Label[]
}

export async function createLabel(userId: string, name: string, color: string): Promise<Label> {
  const { data, error } = await supabase
    .from('labels')
    .insert({ name: name.trim(), color, user_id: userId })
    .select('*')
    .single()

  if (error) throw new Error(`Create label failed: ${error.message}`)
  return data as Label
}

export async function deleteLabel(labelId: string): Promise<void> {
  const { error } = await supabase.from('labels').delete().eq('id', labelId)
  if (error) throw new Error(`Delete label failed: ${error.message}`)
}

export async function fetchTaskLabels(taskId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('task_labels')
    .select('label_id')
    .eq('task_id', taskId)

  if (error) return []
  return (data ?? []).map((row) => row.label_id)
}

export async function setTaskLabels(taskId: string, labelIds: string[]): Promise<void> {
  await supabase.from('task_labels').delete().eq('task_id', taskId)
  if (labelIds.length > 0) {
    await supabase.from('task_labels').insert(
      labelIds.map((label_id) => ({ task_id: taskId, label_id }))
    )
  }
}

// Comments
export async function fetchComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Fetch comments failed: ${error.message}`)
  return (data ?? []) as Comment[]
}

export async function addComment(taskId: string, content: string): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, content: content.trim() })
    .select('*')
    .single()

  if (error) throw new Error(`Add comment failed: ${error.message}`)
  return data as Comment
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) throw new Error(`Delete comment failed: ${error.message}`)
}

// Activity Log
export async function fetchActivity(taskId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return []
  return (data ?? []) as ActivityEntry[]
}

export async function logActivity(taskId: string, action: string, details?: string): Promise<void> {
  await supabase.from('activity_log').insert({
    task_id: taskId,
    action,
    details: details ?? null,
  })
}
