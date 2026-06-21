import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('runKaTeX', () => {
  it('does not throw when window.katex is undefined', async () => {
    const { runKaTeX } = await import('../plugins.js')
    const div = document.createElement('div')
    div.innerHTML = '<math-renderer>x^2</math-renderer>'
    document.body.appendChild(div)
    expect(() => runKaTeX(div)).not.toThrow()
    div.remove()
  })
})

describe('mountView', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('injects content into target element', async () => {
    const { mountView } = await import('../mount.js')
    const div = document.createElement('div')
    document.body.appendChild(div)

    const handle = mountView(div, { html: '<p>Hello world</p>' })
    expect(div.textContent).toContain('Hello world')
    handle.destroy()
  })

  it('applies mycelium-preview class', async () => {
    const { mountView } = await import('../mount.js')
    const div = document.createElement('div')
    document.body.appendChild(div)

    const handle = mountView(div, { html: '<p>test</p>', theme: 'light' })
    expect(div.classList.contains('mycelium-preview')).toBe(true)
    handle.destroy()
    expect(div.classList.contains('mycelium-preview')).toBe(false)
  })

  it('update() swaps content while preserving scrollTop', async () => {
    const { mountView } = await import('../mount.js')
    const div = document.createElement('div')
    Object.defineProperty(div, 'scrollTop', { writable: true, value: 42 })
    document.body.appendChild(div)

    const handle = mountView(div, { html: '<p>First</p>' })
    div.scrollTop = 42
    handle.update('<p>Second</p>')
    expect(div.scrollTop).toBe(42)
    expect(div.textContent).toContain('Second')
    handle.destroy()
  })
})

describe('enableMathCopyAsTex', () => {
  it('returns a cleanup function', async () => {
    const { enableMathCopyAsTex } = await import('../plugins.js')
    const div = document.createElement('div')
    document.body.appendChild(div)
    const cleanup = enableMathCopyAsTex(div)
    expect(typeof cleanup).toBe('function')
    cleanup()
    div.remove()
  })
})

describe('scrollToLine', () => {
  it('scrolls to element with matching data-src-line', async () => {
    const { scrollToLine } = await import('../scroll.js')
    const div = document.createElement('div')
    div.innerHTML = '<p data-src-line="5">line 5</p>'
    document.body.appendChild(div)

    const para = div.querySelector('[data-src-line="5"]') as HTMLElement
    const scrollIntoViewMock = vi.fn()
    para.scrollIntoView = scrollIntoViewMock

    scrollToLine(div, 5)
    expect(scrollIntoViewMock).toHaveBeenCalled()
    div.remove()
  })
})
