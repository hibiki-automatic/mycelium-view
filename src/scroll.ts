export interface ScrollSyncOpts {
  onScrollRatio?: (ratio: number) => void
}

export function scrollToLine(root: HTMLElement, line: number): void {
  const el = root.querySelector(`[data-src-line="${line}"]`) as HTMLElement | null
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
  const totalLines = root.querySelectorAll('[data-src-line]').length || 100
  const ratio = Math.min(line / totalLines, 1)
  root.scrollTop = ratio * (root.scrollHeight - root.clientHeight)
}

export function createScrollSync(root: HTMLElement, opts: ScrollSyncOpts): () => void {
  const handler = () => {
    const scrollable = root.scrollHeight - root.clientHeight
    if (scrollable <= 0) return
    opts.onScrollRatio?.(root.scrollTop / scrollable)
  }
  root.addEventListener('scroll', handler, { passive: true })
  return () => root.removeEventListener('scroll', handler)
}
