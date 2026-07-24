import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onNewTask: () => void
  onSearch: () => void
  onClearFilters: () => void
}

export default function KeyboardShortcuts({ onNewTask, onSearch, onClearFilters }: KeyboardShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        return
      }

      if (event.key === 'n' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        onNewTask()
      }

      if (event.key === '/' || (event.key === 'k' && (event.metaKey || event.ctrlKey))) {
        event.preventDefault()
        onSearch()
      }

      if (event.key === 'Escape') {
        onClearFilters()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewTask, onSearch, onClearFilters])

  return null
}
