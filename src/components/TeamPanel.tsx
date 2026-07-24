import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { createTeamMember, deleteTeamMember } from '../lib/tasks'
import type { TeamMember } from '../types/task'

const MEMBER_COLORS = ['#5b55e7', '#24a47f', '#ec9a35', '#e54d6b', '#3b82f6', '#8b5cf6', '#06b6d4', '#84cc16']

interface TeamPanelProps {
  userId: string
  members: TeamMember[]
  onUpdate: (members: TeamMember[]) => void
  onClose: () => void
}

export default function TeamPanel({ userId, members, onUpdate, onClose }: TeamPanelProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(MEMBER_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!name.trim()) { setError('Enter a name.'); return }
    setBusy(true)
    setError('')
    try {
      const member = await createTeamMember(userId, name, color)
      onUpdate([...members, member])
      setName('')
      setColor(MEMBER_COLORS[(members.length + 1) % MEMBER_COLORS.length])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add member.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(memberId: string) {
    try {
      await deleteTeamMember(memberId)
      onUpdate(members.filter((m) => m.id !== memberId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete member.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Manage</span>
            <h2>Team Members</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="team-list">
          {members.length === 0 && <p className="team-empty">No team members yet. Add one below.</p>}
          {members.map((m) => (
            <div key={m.id} className="team-row">
              <span className="team-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
              <span className="team-name">{m.name}</span>
              <button type="button" className="team-delete" onClick={() => handleDelete(m.id)} aria-label={`Remove ${m.name}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="team-add-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Member name" maxLength={60}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd() } }} />
          <div className="color-picker">
            {MEMBER_COLORS.map((c) => (
              <button key={c} type="button" className={`color-dot ${c === color ? 'color-dot-active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`Select color ${c}`} />
            ))}
          </div>
          <button className="button button-primary" type="button" disabled={busy} onClick={() => void handleAdd()}>Add</button>
        </div>

        {error && <div className="inline-error">{error}</div>}
      </div>
    </div>
  )
}
