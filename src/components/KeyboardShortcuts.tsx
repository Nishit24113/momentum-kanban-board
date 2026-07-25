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
      const target = event.target as HTMLElement

      if (event.key === 'Escape') {
        event.preventDefault()
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
          target.blur()
          onClearFilters()
        } else {
          onEscape()
        }
        return
      }

      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
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
