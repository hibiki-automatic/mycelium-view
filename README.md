# @hibiki-automatic/mycelium-view

Framework-agnostic client runtime for the mycelium markdown view. It takes the
HTML emitted by **mycelium-render** (the SSR markdown→HTML layer, formerly
`md-render`) and brings it to life in the browser: runs **KaTeX** and **Mermaid**
client-side, applies the **mycelium-theme**, wires copy-buttons and
math-copy-as-TeX, and supports **incremental updates** (swap content, preserve
scroll, re-run plugins) and **scroll-sync / autoscroll** out of the box.

Depends on [`@hibiki-automatic/mycelium-theme`](https://github.com/hibiki-automatic/mycelium-theme)
for tokens, CSS, and the class-name constants that match the SSR markup.

## Public API

```ts
import { mountView, type ViewHandle } from '@hibiki-automatic/mycelium-view'

const handle: ViewHandle = mountView(targetEl, {
  html,                 // initial md-render HTML fragment (optional)
  theme: 'auto',        // 'light' | 'dark' | 'auto' (default 'auto')
  onScrollRatio: (r) => {/* 0–1 scroll ratio, for editor↔preview sync */},
})

handle.update(html)     // swap content, PRESERVE scroll, re-run KaTeX/Mermaid/copy/math-copy
handle.scrollToLine(42) // autoscroll to source line 42 (uses [data-src-line], else ratio)
handle.destroy()        // remove styles + listeners, restore the target element
```

Lower-level building blocks are also exported for bespoke integrations:
`runKaTeX`, `runMermaid`, `installCopyButtons`, `enableMathCopyAsTex`,
`scrollToLine`, `createScrollSync`, plus `KATEX_EXPECTED_VERSION` /
`MERMAID_EXPECTED_VERSION` (assert your bundled libs match what was validated).

## Offline / no-CDN

The runtime is **offline-first** and never references a CDN. It drives KaTeX and
Mermaid via the globals `window.katex` / `window.mermaid`, which the consumer is
responsible for loading from **locally served** UMD builds. The pinned, validated
versions (matching md-preview's bundle manifest) are:

| lib     | version  | export | exported constant            |
| ------- | -------- | ------ | ---------------------------- |
| KaTeX   | 0.16.47  | `window.katex`   | `KATEX_EXPECTED_VERSION`   |
| Mermaid | 11.15.0  | `window.mermaid` | `MERMAID_EXPECTED_VERSION` |

If `window.katex` / `window.mermaid` are absent, the runtime degrades gracefully:
text renders, math/diagrams stay as their raw placeholders, no errors thrown.

## Consumer contract — files to serve

From your own origin (no CDN), serve:

1. **`mycelium-view`** — `dist/mycelium-view.es.js` (ESM) or `.cjs.js`. The theme
   CSS is inlined into the bundle and injected at `mountView` time, so no separate
   stylesheet is required for the markdown-body styling.
2. **KaTeX** — `katex.min.js` + `katex.min.css` + the `fonts/KaTeX_*.woff2` glyph
   files (the CSS references them relatively). From
   `node_modules/katex/dist/`. Load the JS so it registers `window.katex` before
   (or any time before the first `update`) you mount.
3. **Mermaid** — `mermaid.min.js` (single-file UMD) from
   `node_modules/mermaid/dist/`. Registers `window.mermaid`.

Optionally serve `github-markdown.css` (5.9.0) if you scope content with
`.markdown-body` (md-render emits that wrapper class).

## How to feed it

- **Initial render** — pass `html` to `mountView`, or call `handle.update(html)`.
- **Incremental updates** — call `handle.update(newHtml)` on every content change
  (e.g. a live-reload WS message or a CRDT edit). Scroll position is preserved and
  only not-yet-processed math/diagram nodes are (re)rendered.
- **Scroll-sync** — pass `onScrollRatio` to observe the view's scroll as a 0–1
  ratio (drive an editor from it); call `handle.scrollToLine(n)` to autoscroll the
  view to a source line (md-render `[data-src-line]` annotations preferred, ratio
  fallback otherwise).

## Markup it consumes

Exactly what mycelium-render emits (class names come from `mycelium-theme`):

- `<math-renderer style="display: inline">TeX</math-renderer>` — inline math
- `<math-renderer class="js-display-math" style="display: block">TeX</math-renderer>` — display math
- `<pre class="mermaid">…graph…</pre>` — Mermaid diagram
- `<div class="code-wrap"><button class="copy-btn">…</button><pre class="hl-code"><code>…</code></pre></div>` — highlighted code with copy button

## Development

```sh
npm install
npm test          # vitest (jsdom) unit tests
npm run build     # ES + CJS bundles + d.ts to dist/
npm run test:e2e  # Playwright headless acceptance suite (real KaTeX + Mermaid)
```

The Playwright suite is the acceptance criterion: it loads the real pinned KaTeX
and Mermaid offline and proves (1) a sample md-render HTML renders math +
diagrams + highlighting + theme, (2) `update()` swaps content and re-renders math
while preserving scroll, (3) math-copy yields TeX, (4) `scrollToLine` moves the
view.
