import { useEffect, useState, type RefObject } from 'react'

export interface ElementSize {
  width: number
  height: number
}

/** Content-box size of an element, kept up to date with a ResizeObserver. 0×0 until measured. */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return size
}
