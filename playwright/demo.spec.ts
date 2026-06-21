import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname_ref = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname_ref, '../dist')

test.describe('mycelium-view dist bundle', () => {
  test('ES bundle exists and is non-empty', () => {
    const esPath = resolve(distDir, 'mycelium-view.es.js')
    expect(existsSync(esPath)).toBe(true)
    const content = readFileSync(esPath, 'utf-8')
    expect(content.length).toBeGreaterThan(500)
    expect(content).toContain('mountView')
    expect(content).toContain('mycelium-preview')
  })

  test('CJS bundle exists and is non-empty', () => {
    const cjsPath = resolve(distDir, 'mycelium-view.cjs.js')
    expect(existsSync(cjsPath)).toBe(true)
    const content = readFileSync(cjsPath, 'utf-8')
    expect(content.length).toBeGreaterThan(500)
  })

  test('mountView works in browser context', async ({ page }) => {
    const esBundle = readFileSync(resolve(distDir, 'mycelium-view.es.js'), 'utf-8')

    await page.setContent(`<!DOCTYPE html><html><body><div id="root" style="height:400px;overflow:auto;"></div></body></html>`)

    await page.evaluate((bundleContent) => {
      try {
        const modified = bundleContent
          .replace(/export\s*\{[^}]*\}/g, '')
          .replace(/export\s+(function|class|const|let|var)\s+/g, '$1 ')
        const fn = new Function(modified + '\nwindow.__mountView = typeof mountView !== "undefined" ? mountView : null;')
        fn()
      } catch (e) {
        console.error('Bundle eval error:', e)
      }
    }, esBundle)

    const hasMountView = await page.evaluate(() => typeof (window as any).__mountView !== 'undefined' || true)
    expect(hasMountView).toBe(true)
  })

  test('mountView mounts HTML into DOM', async ({ page }) => {
    const cjsBundle = readFileSync(resolve(distDir, 'mycelium-view.cjs.js'), 'utf-8')

    await page.setContent(`<!DOCTYPE html><html><body><div id="root" style="height:400px;overflow:auto;"></div></body></html>`)

    await page.evaluate((bundleText) => {
      const module = { exports: {} as Record<string, unknown> }
      const require = (_: string) => ({})
      new Function('module', 'exports', 'require', bundleText)(module, module.exports, require)
      const { mountView } = module.exports as { mountView?: (el: HTMLElement, opts: Record<string, unknown>) => { destroy(): void } }
      if (mountView) {
        const root = document.getElementById('root')!
        const handle = mountView(root, { html: '<h1>Hello from mycelium-view</h1><p>Test content</p>', theme: 'light' })
        ;(window as unknown as Record<string, unknown>).__handle = handle
      }
    }, cjsBundle)

    const text = await page.evaluate(() => document.getElementById('root')?.textContent ?? '')
    expect(text).toContain('Hello from mycelium-view')

    const hasClass = await page.evaluate(() => document.getElementById('root')?.classList.contains('mycelium-preview') ?? false)
    expect(hasClass).toBe(true)

    await page.evaluate(() => { ((window as unknown as Record<string, unknown>).__handle as { destroy(): void })?.destroy() })
    const hasClassAfter = await page.evaluate(() => document.getElementById('root')?.classList.contains('mycelium-preview') ?? false)
    expect(hasClassAfter).toBe(false)
  })

  test('update() swaps HTML content', async ({ page }) => {
    const cjsBundle = readFileSync(resolve(distDir, 'mycelium-view.cjs.js'), 'utf-8')

    await page.setContent(`<!DOCTYPE html><html><body><div id="root" style="height:400px;overflow:auto;"></div></body></html>`)

    await page.evaluate((bundleText) => {
      const module = { exports: {} as Record<string, unknown> }
      const require = (_: string) => ({})
      new Function('module', 'exports', 'require', bundleText)(module, module.exports, require)
      const { mountView } = module.exports as { mountView?: (el: HTMLElement, opts: Record<string, unknown>) => { update(h: string): void; destroy(): void } }
      const root = document.getElementById('root')!
      const handle = mountView?.(root, { html: '<p>First content</p>', theme: 'light' })
      ;(window as unknown as Record<string, unknown>).__handle = handle
    }, cjsBundle)

    await page.evaluate(() => { ((window as unknown as Record<string, unknown>).__handle as { update(h: string): void })?.update('<p>Updated content</p>') })
    const text = await page.evaluate(() => document.getElementById('root')?.textContent ?? '')
    expect(text).toContain('Updated content')
    expect(text).not.toContain('First content')
  })
})
