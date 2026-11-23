import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NavCtx = createContext(null)
export const useNav = () => useContext(NavCtx)

/* Minimal stack navigator: go (push), back (pop), reset (replace whole stack), replace (swap top). */
export function NavProvider({ children, fallbackHome, initial }) {
  const [stack, setStack] = useState([{ id: initial?.id || 'splash', p: initial?.params || {} }])
  const [dir, setDir] = useState('reset')

  const go = useCallback((id, p = {}) => { setDir('push'); setStack((s) => [...s, { id, p }]) }, [])
  const reset = useCallback((id, p = {}) => { setDir('reset'); setStack([{ id, p }]) }, [])
  const replace = useCallback((id, p = {}) => { setDir('push'); setStack((s) => [...s.slice(0, -1), { id, p }]) }, [])
  const back = useCallback(() => {
    setDir('pop')
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ id: fallbackHome?.() || 'welcome', p: {} }]))
  }, [fallbackHome])
  const popTo = useCallback((id) => {
    setDir('pop')
    setStack((s) => {
      const i = s.map((x) => x.id).lastIndexOf(id)
      return i >= 0 ? s.slice(0, i + 1) : s
    })
  }, [])

  const top = stack[stack.length - 1]
  const value = useMemo(
    () => ({ id: top.id, params: top.p, depth: stack.length, dir, stack, go, back, reset, replace, popTo }),
    [top, stack, dir, go, back, reset, replace, popTo],
  )
  return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>
}
