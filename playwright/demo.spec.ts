import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Headless acceptance suite — the load-bearing proof that every product can
// migrate onto mycelium-view. Loads the REAL pinned KaTeX (0.16.47) + Mermaid
// (11.15.0) UMD builds from node_modules (NO CDN — matching the offline stance)
// and the freshly built ES bundle, then exercises the public API end to end.

const __dirname_ref = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname_ref, '..')
const distDir = resolve(root, 'dist')

const katexJs = resolve(root, 'node_modules/katex/dist/katex.min.js')
const katexCss = resolve(root, 'node_modules/katex/dist/katex.min.css')
const mermaidJs = resolve(root, 'node_modules/mermaid/dist/mermaid.min.js')
const esBundle = resolve(distDir, 'mycelium-view.es.js')

// A sample of exactly the markup md-render emits: inline + display
// <math-renderer>, a mermaid <pre>, and a syntect .hl-code copy-wrap.
const SAMPLE_HTML = `
<h1>Test document</h1>
<p>Inline math: <math-renderer style="display: inline">x^2 + y^2 = z^2</math-renderer></p>
<math-renderer class="js-display-math" style="display: block">E = mc^2</math-renderer>
<pre class="mermaid">graph TD
  A[Start] --> B[End]</pre>
<div class="code-wrap">
  <button class="copy-btn" type="button">Copy</button>
  <pre class="hl-code"><code>const x = 1;</code></pre>
</div>
`

test.beforeAll(() => {
  // Guard: the bundle and the offline libs must be present before we test.
  expect(existsSync(esBundle), 'dist must be built (npm run build)').toBe(true)
  expect(existsSync(katexJs), 'katex must be installed offline').toBe(true)
  expect(existsSync(mermaidJs), 'mermaid must be installed offline').toBe(true)
})

async function bootPage(page: import('@playwright/test').Page) {
  await page.setContent(
    `<!DOCTYPE html><html><head><style>${readFileSync(katexCss, 'utf-8')}</style></head>` +
      `<body><div id="root" style="height:300px;overflow:auto;"></div></body></html>`,
  )
  // Load the offline render libs — they self-register window.katex / window.mermaid.
  await page.addScriptTag({ path: katexJs })
  await page.addScriptTag({ path: mermaidJs })
  // Import the real built ES module (preserving its exports) via a blob URL, then
  // expose its public API on window for the tests.
  await page.evaluate(async (src) => {
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
    const mod = await import(url)
    ;(window as Record<string, unknown>).__view = mod
  }, readFileSync(esBundle, 'utf-8'))
  await page.waitForFunction(() => typeof (window as Record<string, unknown>).__view !== 'undefined')
}

test.describe('mycelium-view headless acceptance', () => {
  test.beforeEach(async ({ page }) => {
    await bootPage(page)
  })

  // PROOF 1: a sample md-render HTML renders with KaTeX + Mermaid + highlight
  // copy-button + theme.
  test('1: renders KaTeX + Mermaid + highlighting + theme', async ({ page }) => {
    await page.evaluate((html) => {
      const el = document.getElementById('root')!
      ;(window as Record<string, unknown>).__handle = (
        window as Record<string, { mountView: (e: HTMLElement, o: unknown) => unknown }>
      ).__view.mountView(el, { html, theme: 'light' })
    }, SAMPLE_HTML)

    // Theme applied.
    await expect.poll(() => page.evaluate(() => document.getElementById('root')!.classList.contains('mycelium-preview'))).toBe(true)
    // KaTeX produced real .katex render output (2 formulas).
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.katex').length)).toBeGreaterThanOrEqual(2)
    // Mermaid turned the <pre> into an SVG.
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('pre.mermaid svg, .mermaid svg').length), { timeout: 8000 }).toBeGreaterThan(0)
    // Copy button present from the highlight markup.
    expect(await page.locator('.copy-btn').count()).toBe(1)
  })

  // PROOF 2: update() swaps content + re-renders math while preserving scroll.
  test('2: update() swaps + re-renders math, preserves scroll', async ({ page }) => {
    await page.evaluate((html) => {
      const el = document.getElementById('root')!
      ;(window as Record<string, unknown>).__handle = (
        window as Record<string, { mountView: (e: HTMLElement, o: unknown) => unknown }>
      ).__view.mountView(el, { html: html + '<div style="height:1200px"></div>', theme: 'light' })
    }, SAMPLE_HTML)

    // Scroll down, then update.
    await page.evaluate(() => { document.getElementById('root')!.scrollTop = 120 })
    const before = await page.evaluate(() => document.getElementById('root')!.scrollTop)
    expect(before).toBe(120)

    await page.evaluate(() => {
      ;(window as Record<string, { __handle: { update: (h: string) => void } }>).__handle.update(
        '<p>Updated!</p><math-renderer style="display: inline">a + b = c</math-renderer><div style="height:1200px"></div>',
      )
    })

    // Content swapped.
    await expect(page.locator('#root')).toContainText('Updated!')
    // Math re-rendered after the swap.
    await expect.poll(() => page.evaluate(() => document.querySelectorAll('.katex').length)).toBeGreaterThanOrEqual(1)
    // Scroll preserved across the swap.
    expect(await page.evaluate(() => document.getElementById('root')!.scrollTop)).toBe(120)
  })

  // PROOF 3: math-copy yields the original TeX source (not the Unicode fallback).
  test('3: math-copy yields TeX', async ({ page }) => {
    await page.evaluate((html) => {
      const el = document.getElementById('root')!
      ;(window as Record<string, unknown>).__handle = (
        window as Record<string, { mountView: (e: HTMLElement, o: unknown) => unknown }>
      ).__view.mountView(el, { html, theme: 'light' })
    }, SAMPLE_HTML)
    await page.waitForFunction(() => document.querySelectorAll('.katex').length >= 2)

    // Select the display-math .katex node and fire a copy event through the real
    // enableMathCopyAsTex handler; capture what it writes to the clipboard.
    const copied = await page.evaluate(() => {
      const display = document.querySelector('.katex-display .katex') as HTMLElement
      const range = document.createRange()
      range.selectNodeContents(display)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      let captured: string | null = null
      const dt = new DataTransfer()
      const ev = new ClipboardEvent('copy', { clipboardData: dt, bubbles: true, cancelable: true })
      // Intercept setData via the real handler's preventDefault path.
      const origSet = dt.setData.bind(dt)
      dt.setData = (type: string, data: string) => { if (type === 'text/plain') captured = data; origSet(type, data) }
      display.dispatchEvent(ev)
      return captured
    })
    // Display math is wrapped $$…$$ by enableMathCopyAsTex.
    expect(copied).toBe('$$E = mc^2$$')
  })

  // PROOF 4: scrollToLine moves the view to the requested source line.
  test('4: scrollToLine moves the view', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('root')!
      ;(window as Record<string, unknown>).__handle = (
        window as Record<string, { mountView: (e: HTMLElement, o: unknown) => unknown }>
      ).__view.mountView(el, {
        html:
          '<p data-src-line="0">Line 0</p>' +
          '<p data-src-line="50" style="margin-top:1500px">Line 50</p>' +
          '<p data-src-line="100" style="margin-top:1500px">Line 100</p>',
        theme: 'light',
      })
    })

    const before = await page.evaluate(() => document.getElementById('root')!.scrollTop)
    await page.evaluate(() => {
      ;(window as Record<string, { __handle: { scrollToLine: (n: number) => void } }>).__handle.scrollToLine(50)
    })
    // smooth scroll settles asynchronously.
    await expect.poll(() => page.evaluate(() => document.getElementById('root')!.scrollTop)).toBeGreaterThan(before)
  })
})

test.describe('mycelium-view dist bundle', () => {
  test('ES + CJS bundles exist, non-empty, export mountView', () => {
    const es = readFileSync(esBundle, 'utf-8')
    expect(es.length).toBeGreaterThan(500)
    expect(es).toContain('mountView')
    expect(es).toContain('mycelium-preview')
    const cjs = readFileSync(resolve(distDir, 'mycelium-view.cjs.js'), 'utf-8')
    expect(cjs.length).toBeGreaterThan(500)
  })
})
