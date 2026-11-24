import { useCallback, useEffect, useState } from 'react'

/**
 * Ancho real (px) de un elemento, actualizado con ResizeObserver.
 * Sirve para diseños que dependen del espacio disponible y no del tamaño de la pantalla
 * (p. ej. cuando la barra lateral abierta/colapsada cambia el ancho del contenido).
 */
export function useElementWidth<T extends HTMLElement = HTMLDivElement>() {
  const [el, setEl] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  const ref = useCallback((node: T | null) => setEl(node), [])

  useEffect(() => {
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])

  return [ref, width] as const
}
