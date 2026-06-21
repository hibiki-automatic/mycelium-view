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

  // The outer targetEl is the scroll container and carries only the
  // mycelium-preview marker class.  The inner contentEl carries markdown-body
  // so that all github-markdown-css direct-child selectors
  // (.markdown-body>*:first-child, .markdown-body>*:last-child, etc.) apply
  // directly to the rendered content elements — matching exactly how
  // md-preview's /view srcdoc wraps content in <div class="markdown-body">.
  targetEl.classList.add('mycelium-preview')

  targetEl.insertAdjacentHTML('beforeend', '<div class="mycelium-view-content markdown-body"></div>')
  const contentEl = targetEl.querySelector('.mycelium-view-content') as HTMLElement
  if (isDark) contentEl.classList.add('dark')

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
      targetEl.classList.remove('mycelium-preview')
    },
  }
}
