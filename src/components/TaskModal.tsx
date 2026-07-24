import { useEffect, useState } from 'react'
import { Clock, MessageSquare, Send, Trash2, X } from 'lucide-react'
import type { ActivityEntry, Comment, Label, Task, TaskDraft, TaskPriority, TaskStatus, TeamMember } from '../types/task'
import { COLUMNS } from '../types/task'
import { addComment, deleteComment, fetchActivity, fetchComments } from '../lib/tasks'

interface TaskModalProps {
  mode: 'create' | 'edit'
  initialStatus: TaskStatus
  task: Task | null
  busy: boolean
  teamMembers: TeamMember[]
  labels: Label[]
  taskLabels: string[]
  onClose: () => void
  onSave: (draft: TaskDraft) => Promise<void>
  onDelete?: () => Promise<void>
}

const EMPTY_DRAFT: TaskDraft = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'normal',
  due_date: '',
  assignee_id: '',
  label_ids: [],
}

function timeAgo(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function TaskModal({
  mode,
  initialStatus,
  task,
  busy,
  teamMembers,
  labels,
  taskLabels,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT)
  const [validationError, setValidationError] = useState('')
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details')
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentBusy, setCommentBusy] = useState(false)

  useEffect(() => {
    setValidationError('')
    if (task) {
      setDraft({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date ?? '',
        assignee_id: task.assignee_id ?? '',
        label_ids: taskLabels,
      })
      void fetchComments(task.id).then(setComments)
      void fetchActivity(task.id).then(setActivity)
    } else {
      setDraft({ ...EMPTY_DRAFT, status: initialStatus })
      setComments([])
      setActivity([])
    }
  }, [task, initialStatus, taskLabels])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim()) {
      setValidationError('Add a clear task title before saving.')
      return
    }
    setValidationError('')
    await onSave(draft)
  }

  async function handleAddComment() {
    if (!task || !commentText.trim()) return
    setCommentBusy(true)
    try {
      const newComment = await addComment(task.id, commentText)
      setComments((prev) => [...prev, newComment])
      setCommentText('')
    } catch {
      setValidationError('Failed to add comment.')
    } finally {
      setCommentBusy(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch {
      setValidationError('Failed to delete comment.')
    }
  }

  function toggleLabel(labelId: string) {
    setDraft((current) => ({
      ...current,
      label_ids: current.label_ids.includes(labelId)
        ? current.label_ids.filter((id) => id !== labelId)
        : [...current.label_ids, labelId],
    }))
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card modal-card-large" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{mode === 'create' ? 'New work item' : 'Task details'}</span>
            <h2 id="task-modal-title">{mode === 'create' ? 'Create a task' : 'Edit task'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        {mode === 'edit' && task && (
          <div className="modal-tabs">
            <button type="button" className={`modal-tab ${activeTab === 'details' ? 'modal-tab-active' : ''}`} onClick={() => setActiveTab('details')}>
              Details
            </button>
            <button type="button" className={`modal-tab ${activeTab === 'comments' ? 'modal-tab-active' : ''}`} onClick={() => setActiveTab('comments')}>
              <MessageSquare size={14} /> Comments {comments.length > 0 && <span className="tab-badge">{comments.length}</span>}
            </button>
            <button type="button" className={`modal-tab ${activeTab === 'activity' ? 'modal-tab-active' : ''}`} onClick={() => setActiveTab('activity')}>
              <Clock size={14} /> Activity
            </button>
          </div>
        )}

        {activeTab === 'details' && (
          <form onSubmit={handleSubmit}>
            <label>
              Title
              <input
                autoFocus
                maxLength={120}
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Polish onboarding flow"
              />
            </label>

            <label>
              Description
              <textarea
                rows={3}
                maxLength={600}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Add context, acceptance criteria, or notes."
              />
            </label>

            <div className="form-grid">
              <label>
                Status
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as TaskStatus }))}
                >
                  {COLUMNS.map((column) => (
                    <option key={column.id} value={column.id}>{column.title}</option>
                  ))}
                </select>
              </label>

              <label>
                Priority
                <select
                  value={draft.priority}
                  onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as TaskPriority }))}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                Due date
                <input
                  type="date"
                  value={draft.due_date}
                  onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value }))}
                />
              </label>

              <label>
                Assignee
                <select
                  value={draft.assignee_id}
                  onChange={(event) => setDraft((current) => ({ ...current, assignee_id: event.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {labels.length > 0 && (
              <div className="label-picker">
                <span className="label-picker-title">Labels</span>
                <div className="label-picker-list">
                  {labels.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={`label-picker-item ${draft.label_ids.includes(l.id) ? 'label-picker-item-active' : ''}`}
                      style={{ '--label-color': l.color } as React.CSSProperties}
                      onClick={() => toggleLabel(l.id)}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {validationError && <div className="inline-error">{validationError}</div>}

            <div className="modal-actions">
              {mode === 'edit' && onDelete ? (
                <button className="button button-danger" type="button" disabled={busy} onClick={onDelete}>
                  <Trash2 size={16} /> Delete
                </button>
              ) : <span />}
              <div className="modal-actions-right">
                <button className="button button-secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
                <button className="button button-primary" type="submit" disabled={busy}>
                  {busy ? 'Saving...' : mode === 'create' ? 'Create task' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'comments' && task && (
          <div className="comments-section">
            <div className="comments-list">
              {comments.length === 0 && (
                <div className="comments-empty">No comments yet. Start a conversation about this task.</div>
              )}
              {comments.map((c) => (
                <div key={c.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-time">{timeAgo(c.created_at)}</span>
                    <button type="button" className="comment-delete" onClick={() => handleDeleteComment(c.id)} aria-label="Delete comment">
                      <X size={13} />
                    </button>
                  </div>
                  <p className="comment-content">{c.content}</p>
                </div>
              ))}
            </div>
            <div className="comment-input-row">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                maxLength={1000}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddComment() } }}
              />
              <button type="button" className="button button-primary comment-send" disabled={commentBusy || !commentText.trim()} onClick={() => void handleAddComment()}>
                <Send size={15} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'activity' && task && (
          <div className="activity-section">
            {activity.length === 0 && (
              <div className="comments-empty">No activity recorded yet.</div>
            )}
            {activity.map((entry) => (
              <div key={entry.id} className="activity-item">
                <div className="activity-dot" />
                <div className="activity-content">
                  <span className="activity-text">{entry.details ?? entry.action}</span>
                  <span className="activity-time">{timeAgo(entry.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
