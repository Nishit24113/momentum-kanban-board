import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Task } from '../types/task'

interface UseRealtimeSyncOptions {
  userId: string | null
  onInsert: (task: Task) => void
  onUpdate: (task: Task) => void
  onDelete: (taskId: string) => void
}

export function useRealtimeSync({ userId, onInsert, onUpdate, onDelete }: UseRealtimeSyncOptions) {
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('tasks-realtime')
      .on<Task>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => { if (payload.new) onInsert(payload.new as Task) }
      )
      .on<Task>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => { if (payload.new) onUpdate(payload.new as Task) }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => { if (payload.old && 'id' in payload.old) onDelete(payload.old.id as string) }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, onInsert, onUpdate, onDelete])
}
