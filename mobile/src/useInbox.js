import { useCallback, useEffect, useState } from 'react'
import { authService } from './services/authService.js'
import { toRow } from './services/notificationView.js'

/** True when the real API is configured; otherwise the screens keep using the local mock notifications. */
export const remoteInbox = Boolean(authService.isRemote)
const PAGE = 20

/** F-MSG-04 inbox from the API. Does nothing (and stays empty) against the mock. */
export function useInbox(role) {
  const [state, setState] = useState({ items: [], loading: remoteInbox, error: '', more: false })

  const load = useCallback(async (before) => {
    if (!remoteInbox) return
    setState((s) => ({ ...s, loading: true, error: '' }))
    const r = await authService.listNotifications({ limit: PAGE, before })
    setState((s) =>
      r.ok
        ? { items: before ? [...s.items, ...r.notifications] : r.notifications, loading: false, error: '', more: r.notifications.length === PAGE }
        : { ...s, loading: false, error: r.message },
    )
  }, [])

  useEffect(() => {
    load()
  }, [load, role])

  const markRead = async (id) => {
    const r = await authService.markNotificationRead(id)
    if (r.ok) setState((s) => ({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, read: true } : x)) }))
    return r
  }
  const markAll = async () => {
    const r = await authService.markAllNotificationsRead()
    if (r.ok) setState((s) => ({ ...s, items: s.items.map((x) => ({ ...x, read: true })) }))
    return r
  }
  const loadMore = () => load(state.items[state.items.length - 1]?.createdAt)

  return { rows: state.items.map((x) => toRow(x, role)), loading: state.loading, error: state.error, more: state.more, markRead, markAll, loadMore, reload: () => load() }
}

/** Unread count for the bell badge. Zero while signed out or against the mock. */
export function useUnreadCount(role) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!remoteInbox) return
    let live = true
    authService.getUnreadNotificationCount().then((r) => live && setCount(r.ok ? r.count : 0))
    return () => {
      live = false
    }
  }, [role])
  return count
}
