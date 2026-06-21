import { myceliumCss, myceliumDarkCss } from '@hibiki-automatic/mycelium-theme'
import { runKaTeX, runMermaid, installCopyButtons, enableMathCopyAsTex } from './plugins.js'
import { scrollToLine as _scrollToLine, createScrollSync } from './scroll.js'
import type { ScrollSyncOpts } from './scroll.js'

export interface MountOpts {
  html?: string
  theme?: 'light' | 'dark' | 'auto'
  onScrollRatio?: ScrollSyncOpts['onScrollRatio']
}

export interface ViewHandle {
  update(html: string): void
  scrollToLine(n: number): number
  destroy(): void
}

export function mountView(targetEl: HTMLElement, opts: MountOpts = {}): ViewHandle {
  const { html = '', theme = 'auto', onScrollRatio } = opts

  const styleEl = document.createElement('style')
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  styleEl.textContent = myceliumCss + '\n' + myceliumDarkCss
  targetEl.appendChild(styleEl)

  targetEl.classList.add('mycelium-preview')
  if (isDark) targetEl.classList.add('dark')

  targetEl.insertAdjacentHTML('beforeend', '<div class="mycelium-view-content"></div>')
  const contentEl = targetEl.querySelector('.mycelium-view-content') as HTMLElement

  let mathCopyCleanup: (() => void) | null = null
  let copyBtnCleanup: (() => void) | null = null
  let scrollSyncCleanup: (() => void) | null = null

  function runPlugins() {
    runKaTeX(contentEl)
    runMermaid(contentEl)
    if (copyBtnCleanup) { copyBtnCleanup(); copyBtnCleanup = null }
    copyBtnCleanup = installCopyButtons(contentEl)
    if (mathCopyCleanup) { mathCopyCleanup(); mathCopyCleanup = null }
    mathCopyCleanup = enableMathCopyAsTex(contentEl)
  }

  function setHtml(newHtml: string) {
    contentEl.innerHTML = newHtml
    runPlugins()
  }

  if (html) setHtml(html)

  if (onScrollRatio) {
    scrollSyncCleanup = createScrollSync(targetEl, { onScrollRatio })
  }

  return {
    update(newHtml: string) {
      const savedTop = targetEl.scrollTop
      setHtml(newHtml)
      targetEl.scrollTop = savedTop
    },
    scrollToLine(n: number) {
      // The scroll container is `targetEl`; line-annotated nodes live inside it
      // (within `contentEl`). Scroll the container so the ratio fallback and
      // scrollIntoView both move the right element.
      _scrollToLine(targetEl, n)
      return targetEl.scrollTop
    },
    destroy() {
      mathCopyCleanup?.()
      copyBtnCleanup?.()
      scrollSyncCleanup?.()
      styleEl.remove()
      contentEl.remove()
      targetEl.classList.remove('mycelium-preview', 'dark')
    },
  }
}
