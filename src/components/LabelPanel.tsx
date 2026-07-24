import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { createLabel, deleteLabel } from '../lib/tasks'
import type { Label } from '../types/task'
import { LABEL_COLORS } from '../types/task'

interface LabelPanelProps {
  userId: string
  labels: Label[]
  onUpdate: (labels: Label[]) => void
  onClose: () => void
}

export default function LabelPanel({ userId, labels, onUpdate, onClose }: LabelPanelProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd() {
    if (!name.trim()) { setError('Enter a label name.'); return }
    setBusy(true)
    setError('')
    try {
      const label = await createLabel(userId, name, color)
      onUpdate([...labels, label])
      setName('')
      setColor(LABEL_COLORS[(labels.length + 1) % LABEL_COLORS.length])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add label.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(labelId: string) {
    try {
      await deleteLabel(labelId)
      onUpdate(labels.filter((l) => l.id !== labelId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete label.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">Manage</span>
            <h2>Labels</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="team-list">
          {labels.length === 0 && <p className="team-empty">No labels yet. Create one below.</p>}
          {labels.map((l) => (
            <div key={l.id} className="team-row">
              <span className="label-color-dot" style={{ background: l.color }} />
              <span className="team-name">{l.name}</span>
              <button type="button" className="team-delete" onClick={() => handleDelete(l.id)} aria-label={`Delete ${l.name}`}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="team-add-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label name (e.g. Bug, Feature)" maxLength={30}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAdd() } }} />
          <div className="color-picker">
            {LABEL_COLORS.map((c) => (
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
