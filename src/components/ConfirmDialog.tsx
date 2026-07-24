import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="confirm-icon"><AlertTriangle size={22} /></div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="button button-secondary" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
          <button className="button button-danger" type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting...' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
