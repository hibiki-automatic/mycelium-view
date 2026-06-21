import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Regression tests for real browser bugs found by the chair.
//
// Bug 1: math-copy drops prose — selecting a paragraph with prose + formulas
//        yields only the formulas space-joined (prose vanishes).  The bug
//        lives in md-preview's srcdoc inline enableMathCopyAsTex (shell.rs),
//        which does parts.join(" ") instead of the correct walk-based
//        reconstruction.  These tests VERIFY that mycelium-view's own
//        enableMathCopyAsTex (in plugins.ts) is correct and does preserve
//        prose.  The handler must be attached via mountView and must fire.
//
// Bug 2: styling diverges from md-preview's /view.  The /view srcdoc puts
//        content DIRECTLY inside <div class="markdown-body">, so every CSS
//        direct-child rule (.markdown-body>*:first-child etc.) applies to the
//        real content elements.  mycelium-view currently applies markdown-body
//        to the outer targetEl while content lives in the nested
//        .mycelium-view-content wrapper, so those direct-child rules miss the
//        content.  The fix: move markdown-body to contentEl.

const __dirname_ref = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname_ref, '..')
const distDir = resolve(root, 'dist')

const katexJs = resolve(root, 'node_modules/katex/dist/katex.min.js')
const katexCss = resolve(root, 'node_modules/katex/dist/katex.min.css')
const mermaidJs = resolve(root, 'node_modules/mermaid/dist/mermaid.min.js')
const esBundle = resolve(distDir, 'mycelium-view.es.js')

// Paragraph that triggered the chair's report:
// prose + 2 inline formulas + 1 display formula, prose must survive copy.
const MIXED_HTML = `<p id="para">Let <math-renderer style="display:inline">a = 1229</math-renderer> and <math-renderer style="display:inline">c = 351750</math-renderer> then <math-renderer class="js-display-math" style="display:block">X_1 = \\sqrt{-2 \\log U_1}\\cos(2\\pi U_2)</math-renderer> holds.</p>`

const PROSE_ONLY_HTML = `<p id="prose">Just plain text here, no formulas.</p>`

const SINGLE_FORMULA_HTML = `<p id="sfpara">Value: <math-renderer style="display:inline">z = x + y</math-renderer> done.</p>`

// Sample used for styling checks: h1 as first content element.
const STYLED_HTML = `<h1>Heading</h1><p>A paragraph with <code>inline code</code>.</p>`

test.beforeAll(() => {
  expect(existsSync(esBundle), 'dist must be built (npm run build)').toBe(true)
  expect(existsSync(katexJs), 'katex must be installed').toBe(true)
  expect(existsSync(mermaidJs), 'mermaid must be installed').toBe(true)
})

async function bootPage(page: import('@playwright/test').Page) {
  await page.setContent(
    `<!DOCTYPE html><html><head><style>${readFileSync(katexCss, 'utf-8')}</style></head>` +
      `<body><div id="root" style="height:600px;overflow:auto;"></div></body></html>`,
  )
  await page.addScriptTag({ path: katexJs })
  await page.addScriptTag({ path: mermaidJs })
  await page.evaluate(async (src) => {
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
    const mod = await import(url)
    ;(window as Record<string, unknown>).__view = mod
  }, readFileSync(esBundle, 'utf-8'))
  await page.waitForFunction(() => typeof (window as Record<string, unknown>).__view !== 'undefined')
}

async function mountHtml(page: import('@playwright/test').Page, html: string) {
  await page.evaluate((h) => {
    const el = document.getElementById('root')!
    ;(window as Record<string, unknown>).__handle = (
      window as Record<string, { mountView: (e: HTMLElement, o: unknown) => unknown }>
    ).__view.mountView(el, { html: h, theme: 'light' })
  }, html)
}

// ---------------------------------------------------------------------------
// BUG 1 — math-copy must preserve prose (not drop it)
// ---------------------------------------------------------------------------

test.describe('Bug 1: math-copy prose-preservation (enableMathCopyAsTex)', () => {
  test.beforeEach(async ({ page }) => {
    await bootPage(page)
  })

  // This is the primary regression: prose + multiple formulas in one paragraph.
  // The CORRECT output preserves prose in-place with each formula replaced by
  // its $…$ / $$…$$ TeX source.
  test('prose-and-formulas paragraph: prose preserved, formulas inline-replaced', async ({ page }) => {
    await mountHtml(page, MIXED_HTML)
    await page.waitForFunction(() => document.querySelectorAll('.katex').length >= 3)

    const result = await page.evaluate(() => {
      const para = document.getElementById('para')!
      const range = document.createRange()
      range.selectNodeContents(para)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)

      let captured: string | null = null
      const dt = new DataTransfer()
      const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })
      const origSet = dt.setData.bind(dt)
      ;(dt as DataTransfer & { setData: typeof dt.setData }).setData = (type: string, data: string) => {
        if (type === 'text/plain') captured = data
        origSet(type, data)
      }
      para.dispatchEvent(ev)
      return captured
    })

    // Full prose must be present, each formula replaced IN-PLACE by its TeX.
    // NOT formulas-only joined with spaces (the broken srcdoc behaviour).
    const expected =
      'Let $a = 1229$ and $c = 351750$ then $$X_1 = \\sqrt{-2 \\log U_1}\\cos(2\\pi U_2)$$ holds.'
    expect(result, `Prose dropped!\nGot:      ${JSON.stringify(result)}\nExpected: ${JSON.stringify(expected)}`).toBe(expected)
  })

  // Handler must not intercept when the selection contains no math.
  test('prose-only selection: handler does not override (returns null)', async ({ page }) => {
    await mountHtml(page, PROSE_ONLY_HTML)

    const result = await page.evaluate(() => {
      const para = document.getElementById('prose')!
      const range = document.createRange()
      range.selectNodeContents(para)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)

      let captured: string | null = null
      const dt = new DataTransfer()
      const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })
      const origSet = dt.setData.bind(dt)
      ;(dt as DataTransfer & { setData: typeof dt.setData }).setData = (type: string, data: string) => {
        if (type === 'text/plain') captured = data
        origSet(type, data)
      }
      para.dispatchEvent(ev)
      return captured
    })

    expect(result, 'Handler must not intercept prose-only selection').toBeNull()
  })

  // Single inline formula gives back $…$.
  test('single inline formula: yields $…$ TeX', async ({ page }) => {
    await mountHtml(page, SINGLE_FORMULA_HTML)
    await page.waitForFunction(() => document.querySelectorAll('.katex').length >= 1)

    const result = await page.evaluate(() => {
      const katexEl = document.querySelector('.katex') as HTMLElement
      if (!katexEl) return null
      const range = document.createRange()
      range.selectNodeContents(katexEl)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)

      let captured: string | null = null
      const dt = new DataTransfer()
      const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })
      const origSet = dt.setData.bind(dt)
      ;(dt as DataTransfer & { setData: typeof dt.setData }).setData = (type: string, data: string) => {
        if (type === 'text/plain') captured = data
        origSet(type, data)
      }
      katexEl.dispatchEvent(ev)
      return captured
    })

    expect(result).toBe('$z = x + y$')
  })

  // The handler must be attached through mountView and fire via event bubbling.
  test('handler attached via mountView and fires for child elements', async ({ page }) => {
    await mountHtml(page, SINGLE_FORMULA_HTML)
    await page.waitForFunction(() => document.querySelectorAll('.katex').length >= 1)

    const intercepted = await page.evaluate(() => {
      // The handler is on .mycelium-view-content (contentEl).
      // A copy event on a .katex child must bubble up and be caught.
      const contentEl = document.querySelector('.mycelium-view-content') as HTMLElement
      if (!contentEl) return 'no-content-el'
      const katexEl = contentEl.querySelector('.katex') as HTMLElement
      if (!katexEl) return 'no-katex'

      const range = document.createRange()
      range.selectNodeContents(katexEl)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)

      let fired = false
      const dt = new DataTransfer()
      const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })
      const origSet = dt.setData.bind(dt)
      ;(dt as DataTransfer & { setData: typeof dt.setData }).setData = (type: string, data: string) => {
        if (type === 'text/plain') fired = true
        origSet(type, data)
      }
      katexEl.dispatchEvent(ev)
      return fired ? 'intercepted' : 'not-intercepted'
    })

    expect(intercepted).toBe('intercepted')
  })
})

// ---------------------------------------------------------------------------
// BUG 2 — styling must match md-preview's /view (markdown-body on contentEl)
// ---------------------------------------------------------------------------
//
// The /view srcdoc wraps content in <div class="markdown-body"> so EVERY
// CSS rule applies at the right level.  In mycelium-view the outer targetEl
// carries markdown-body while content lives in .mycelium-view-content inside
// it.  The direct-child rules (.markdown-body>*:first-child, etc.) therefore
// miss the actual content elements.
//
// FIX: move the markdown-body class to contentEl (.mycelium-view-content).
// The targetEl keeps mycelium-preview only.

test.describe('Bug 2: styling matches md-preview /view (markdown-body on contentEl)', () => {
  test.beforeEach(async ({ page }) => {
    await bootPage(page)
  })

  // FAILS on current code: markdown-body is on targetEl (outer container),
  // not on contentEl, so .markdown-body>*:first-child does not apply to <h1>.
  test('markdown-body class must be on the content wrapper, NOT the outer target', async ({ page }) => {
    await mountHtml(page, STYLED_HTML)

    const classes = await page.evaluate(() => {
      const root = document.getElementById('root')!
      const content = root.querySelector('.mycelium-view-content') as HTMLElement | null
      return {
        rootClasses: Array.from(root.classList).sort(),
        contentClasses: content ? Array.from(content.classList).sort() : [],
        contentHasMarkdownBody: content?.classList.contains('markdown-body') ?? false,
        rootHasMarkdownBody: root.classList.contains('markdown-body'),
      }
    })

    // After fix: contentEl carries markdown-body; targetEl has only mycelium-preview.
    expect(
      classes.contentHasMarkdownBody,
      `Content wrapper must have markdown-body class.\nRoot classes: ${JSON.stringify(classes.rootClasses)}\nContent classes: ${JSON.stringify(classes.contentClasses)}`,
    ).toBe(true)
    expect(
      classes.rootHasMarkdownBody,
      'Outer targetEl must NOT have markdown-body (causes styling collisions)',
    ).toBe(false)
  })

  // FAILS on current code: with markdown-body on targetEl, the direct-child
  // selector .markdown-body>*:first-child{ margin-top:0 } applies to the
  // wrapper div, not to <h1>.  After fix, <h1> is a direct child of
  // .markdown-body (the contentEl) and gets margin-top:0.
  test('first content element (h1) has margin-top 0 (github-markdown direct-child rule)', async ({ page }) => {
    await mountHtml(page, STYLED_HTML)

    const marginTop = await page.evaluate(() => {
      const h1 = document.querySelector('h1')
      if (!h1) return 'no-h1'
      return window.getComputedStyle(h1).marginTop
    })

    // .markdown-body>*:first-child { margin-top: 0 !important }
    // This must be 0px on the h1 (which IS the first content element after fix).
    expect(marginTop, `h1 margin-top should be 0px (got ${marginTop})`).toBe('0px')
  })

  // Verify that h1 styling (font-size, border-bottom) from github-markdown
  // IS applied — these use descendant selectors and should work regardless.
  test('h1 receives github-markdown font-size 2em rule', async ({ page }) => {
    await mountHtml(page, STYLED_HTML)

    const fontSize = await page.evaluate(() => {
      const h1 = document.querySelector('h1')
      if (!h1) return 'no-h1'
      return window.getComputedStyle(h1).fontSize
    })

    // .markdown-body h1 { font-size: 2em } — 2 × 16px = 32px
    const fsPx = parseFloat(fontSize)
    expect(
      fsPx,
      `h1 font-size should be ~32px (2em of 16px base), got ${fontSize}`,
    ).toBeGreaterThanOrEqual(30)
  })

  // Verify destroy() removes the class from the correct element.
  test('destroy() removes markdown-body from contentEl (not from targetEl)', async ({ page }) => {
    await mountHtml(page, STYLED_HTML)

    const afterDestroy = await page.evaluate(() => {
      const root = document.getElementById('root')!
      ;(window as Record<string, { __handle: { destroy: () => void } }>).__handle.destroy()
      return {
        rootClasses: Array.from(root.classList).sort(),
        contentPresent: !!root.querySelector('.mycelium-view-content'),
      }
    })

    // After destroy, neither targetEl nor contentEl (which is removed) has markdown-body.
    expect(afterDestroy.contentPresent, 'contentEl should be removed by destroy()').toBe(false)
    expect(
      afterDestroy.rootClasses,
      'targetEl should be clean after destroy()',
    ).not.toContain('markdown-body')
    expect(afterDestroy.rootClasses).not.toContain('mycelium-preview')
  })
})
