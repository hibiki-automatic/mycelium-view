declare global {
  interface Window {
    katex?: { render(tex: string, el: Element, opts: {displayMode: boolean, throwOnError: boolean}): void }
    mermaid?: {
      initialize(opts: {startOnLoad: boolean, theme: string}): void
      run(opts: {nodes: NodeListOf<Element> | Element[]}): void
    }
  }
}

import { TAG_MATH_RENDERER, ATTR_TYPESET, CLASS_MERMAID, ATTR_PROCESSED, CLASS_DISPLAY_MATH, CLASS_COPY_BTN, CLASS_COPY_BTN_COPIED, CLASS_KATEX, CLASS_KATEX_DISPLAY } from '@hibiki-automatic/mycelium-theme'

let mermaidInitialized = false

export function runKaTeX(root: HTMLElement): void {
  if (typeof window === 'undefined' || !window.katex) return
  const nodes = root.querySelectorAll(`${TAG_MATH_RENDERER}:not([${ATTR_TYPESET}])`)
  nodes.forEach((el) => {
    const tex = el.textContent?.trim() ?? ''
    const display = el.classList.contains(CLASS_DISPLAY_MATH)
    try {
      window.katex!.render(tex, el, { displayMode: display, throwOnError: false })
      el.setAttribute(ATTR_TYPESET, '')
    } catch { /* leave raw TeX */ }
  })
}

export function runMermaid(root: HTMLElement): void {
  if (typeof window === 'undefined' || !window.mermaid) return
  if (!mermaidInitialized) {
    const dark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
    try {
      window.mermaid!.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default' })
      mermaidInitialized = true
    } catch { return }
  }
  const nodes = root.querySelectorAll(`pre.${CLASS_MERMAID}:not([${ATTR_PROCESSED}])`)
  if (nodes.length) {
    try { window.mermaid!.run({ nodes }) } catch { /* malformed diagram */ }
  }
}

export function installCopyButtons(root: HTMLElement): () => void {
  const handler = (ev: MouseEvent) => {
    const btn = (ev.target as Element).closest?.(`.${CLASS_COPY_BTN}`) as HTMLElement | null
    if (!btn) return
    const code = btn.parentElement?.querySelector('pre code')
    if (!code) return
    navigator.clipboard?.writeText(code.textContent ?? '').then(() => {
      btn.classList.add(CLASS_COPY_BTN_COPIED)
      setTimeout(() => btn.classList.remove(CLASS_COPY_BTN_COPIED), 2000)
    }).catch(() => {})
  }
  root.addEventListener('click', handler as EventListener)
  return () => root.removeEventListener('click', handler as EventListener)
}

export function enableMathCopyAsTex(rootEl: HTMLElement): () => void {
  const handler = (e: Event) => {
    const clipboardEvent = e as ClipboardEvent
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return
    if (!clipboardEvent.clipboardData) return

    const range = selection.getRangeAt(0)
    const fragment = range.cloneContents()

    const hasKatexInFragment = fragment.querySelector(`.${CLASS_KATEX}`) !== null
    const anchorInsideKatex =
      !hasKatexInFragment && closestKatex(range.startContainer, rootEl) !== null

    if (!hasKatexInFragment && !anchorInsideKatex) {
      return
    }

    if (anchorInsideKatex) {
      const katexEl = closestKatex(range.startContainer, rootEl)!
      const tex = extractTex(katexEl)
      if (tex === null) return
      clipboardEvent.preventDefault()
      clipboardEvent.clipboardData.setData('text/plain', tex)
      return
    }

    const result = collectText(fragment)
    if (result === null) return

    clipboardEvent.preventDefault()
    clipboardEvent.clipboardData.setData('text/plain', result)
  }

  rootEl.addEventListener('copy', handler)
  return () => rootEl.removeEventListener('copy', handler)
}

function collectText(node: Node): string | null {
  let out = ''
  let hasKatex = false
  let allKatexExtracted = true

  function walk(n: Node): void {
    if (n.nodeType === Node.TEXT_NODE) {
      out += n.textContent ?? ''
      return
    }

    if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as Element
      if (el.classList.contains(CLASS_KATEX)) {
        hasKatex = true
        const tex = extractTex(el)
        if (tex !== null) {
          out += tex
        } else {
          allKatexExtracted = false
        }
        return
      }
    }

    if (
      n.nodeType === Node.ELEMENT_NODE ||
      n.nodeType === Node.DOCUMENT_FRAGMENT_NODE
    ) {
      for (const child of Array.from(n.childNodes)) {
        walk(child)
      }
    }
  }

  walk(node)

  if (hasKatex && !allKatexExtracted) return null
  return out
}

function closestKatex(node: Node, root: HTMLElement): Element | null {
  let current: Node | null = node
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as Element
      if (el.classList.contains(CLASS_KATEX)) return el
    }
    current = current.parentNode
  }
  return null
}

function extractTex(katexEl: Element): string | null {
  const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]')
  if (!annotation || !annotation.textContent) return null

  const tex = annotation.textContent.trim()

  const isDisplay =
    katexEl.closest(`.${CLASS_KATEX_DISPLAY}`) !== null ||
    katexEl.getAttribute('data-display') === 'true'

  return isDisplay ? `$$${tex}$$` : `$${tex}$`
}
