import { useEffect } from 'react'

interface KeyboardShortcutsProps {
  onNewTask: () => void
  onSearch: () => void
  onClearFilters: () => void
  onEscape: () => void
}

export default function KeyboardShortcuts({ onNewTask, onSearch, onClearFilters, onEscape }: KeyboardShortcutsProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscape()
        return
      }

      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) {
        if (event.key === 'Escape') {
          ;(event.target as HTMLElement).blur()
        }
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewTask, onSearch, onClearFilters, onEscape])

  return null
}
