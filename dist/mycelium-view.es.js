const T = {
  bg: "#ffffff",
  fg: "#1a1a2e",
  heading: "#1a1a2e",
  link: "#0066cc",
  code: "#d63031",
  codeBg: "#f4f4f8",
  codeBorder: "#e0e0e8",
  em: "#555577",
  strong: "#1a1a2e",
  quote: "#666688",
  quoteBg: "#f8f8fc",
  quoteBorder: "#c0c0d8",
  keyword: "#8b008b",
  string: "#228b22",
  number: "#b8860b",
  comment: "#808080",
  type: "#00688b",
  border: "#e0e0e8"
}, k = {
  bg: "#1e1e2e",
  fg: "#cdd6f4",
  heading: "#cba6f7",
  link: "#89b4fa",
  code: "#f38ba8",
  codeBg: "#181825",
  codeBorder: "#313244",
  em: "#a6adc8",
  strong: "#cdd6f4",
  quote: "#a6adc8",
  quoteBg: "#181825",
  quoteBorder: "#45475a",
  keyword: "#cba6f7",
  string: "#a6e3a1",
  number: "#fab387",
  comment: "#6c7086",
  type: "#89dceb",
  border: "#313244"
};
function v(e) {
  return `
/* mycelium preview theme */
.mycelium-preview {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 16px;
  color: ${e.fg};
  background: ${e.bg};
  line-height: 1.7;
  padding: 16px;
}
.mycelium-preview h1 { font-size: 1.6em; font-weight: bold; color: ${e.heading}; margin: 0.8em 0 0.4em; }
.mycelium-preview h2 { font-size: 1.4em; font-weight: bold; color: ${e.heading}; margin: 0.8em 0 0.4em; }
.mycelium-preview h3 { font-size: 1.2em; font-weight: bold; color: ${e.heading}; margin: 0.8em 0 0.4em; }
.mycelium-preview h4 { font-size: 1.1em; font-weight: bold; color: ${e.heading}; margin: 0.8em 0 0.4em; }
.mycelium-preview h5, .mycelium-preview h6 { font-weight: bold; color: ${e.heading}; margin: 0.8em 0 0.4em; }
.mycelium-preview strong { font-weight: bold; color: ${e.strong}; }
.mycelium-preview em { font-style: italic; color: ${e.em}; }
.mycelium-preview a { color: ${e.link}; text-decoration: underline; }
.mycelium-preview code {
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  color: ${e.code};
  background: ${e.codeBg};
  padding: 0.15em 0.3em;
  border-radius: 3px;
  font-size: 0.9em;
}
.mycelium-preview pre {
  background: ${e.codeBg};
  border: 1px solid ${e.codeBorder};
  border-radius: 6px;
  padding: 12px 16px;
  overflow-x: auto;
}
.mycelium-preview pre code {
  background: none;
  padding: 0;
  color: ${e.fg};
}
.mycelium-preview blockquote {
  color: ${e.quote};
  background: ${e.quoteBg};
  border-left: 4px solid ${e.quoteBorder};
  padding: 8px 16px;
  margin: 0.8em 0;
  font-style: italic;
}
.mycelium-preview ul, .mycelium-preview ol { padding-left: 2em; margin: 0.5em 0; }
.mycelium-preview li { margin: 0.2em 0; }
.mycelium-preview hr { border: none; border-top: 1px solid ${e.border}; margin: 1.5em 0; }
.mycelium-preview p { margin: 0.7em 0; }
.mycelium-preview table { border-collapse: collapse; width: 100%; }
.mycelium-preview th, .mycelium-preview td { border: 1px solid ${e.border}; padding: 6px 12px; }
.mycelium-preview th { background: ${e.codeBg}; font-weight: bold; }
/* syntax highlight colors matching editor */
.mycelium-preview .hljs-keyword { color: ${e.keyword}; }
.mycelium-preview .hljs-string { color: ${e.string}; }
.mycelium-preview .hljs-number { color: ${e.number}; }
.mycelium-preview .hljs-comment { color: ${e.comment}; font-style: italic; }
.mycelium-preview .hljs-type { color: ${e.type}; }
`.trim();
}
function E(e) {
  return v(e).replace(/\.mycelium-preview/g, ".mycelium-preview.dark");
}
const L = v(T), N = E(k), D = "copy-btn", w = "copied", q = "mermaid", M = "math-renderer", h = "data-typeset", C = "data-processed", B = "js-display-math", f = "katex", S = "katex-display";
let g = !1;
function A(e) {
  if (typeof window > "u" || !window.katex) return;
  e.querySelectorAll(`${M}:not([${h}])`).forEach((t) => {
    var r;
    const o = ((r = t.textContent) == null ? void 0 : r.trim()) ?? "", i = t.classList.contains(B);
    try {
      window.katex.render(o, t, { displayMode: i, throwOnError: !1 }), t.setAttribute(h, "");
    } catch {
    }
  });
}
function O(e) {
  if (typeof window > "u" || !window.mermaid) return;
  if (!g) {
    const t = typeof window.matchMedia == "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    try {
      window.mermaid.initialize({ startOnLoad: !1, theme: t ? "dark" : "default" }), g = !0;
    } catch {
      return;
    }
  }
  const n = e.querySelectorAll(`pre.${q}:not([${C}])`);
  if (n.length)
    try {
      window.mermaid.run({ nodes: n });
    } catch {
    }
}
function _(e) {
  const n = (t) => {
    var r, a, c, l;
    const o = (a = (r = t.target).closest) == null ? void 0 : a.call(r, `.${D}`);
    if (!o) return;
    const i = (c = o.parentElement) == null ? void 0 : c.querySelector("pre code");
    i && ((l = navigator.clipboard) == null || l.writeText(i.textContent ?? "").then(() => {
      o.classList.add(w), setTimeout(() => o.classList.remove(w), 2e3);
    }).catch(() => {
    }));
  };
  return e.addEventListener("click", n), () => e.removeEventListener("click", n);
}
function z(e) {
  const n = (t) => {
    const o = t, i = window.getSelection();
    if (!i || i.isCollapsed || !o.clipboardData) return;
    const r = i.getRangeAt(0), a = r.cloneContents(), c = a.querySelector(`.${f}`) !== null, l = !c && b(r.startContainer, e) !== null;
    if (!c && !l)
      return;
    if (l) {
      const s = b(r.startContainer, e), u = x(s);
      if (u === null) return;
      o.preventDefault(), o.clipboardData.setData("text/plain", u);
      return;
    }
    const d = R(a);
    d !== null && (o.preventDefault(), o.clipboardData.setData("text/plain", d));
  };
  return e.addEventListener("copy", n), () => e.removeEventListener("copy", n);
}
function R(e) {
  let n = "", t = !1, o = !0;
  function i(r) {
    if (r.nodeType === Node.TEXT_NODE) {
      n += r.textContent ?? "";
      return;
    }
    if (r.nodeType === Node.ELEMENT_NODE) {
      const a = r;
      if (a.classList.contains(f)) {
        t = !0;
        const c = x(a);
        c !== null ? n += c : o = !1;
        return;
      }
    }
    if (r.nodeType === Node.ELEMENT_NODE || r.nodeType === Node.DOCUMENT_FRAGMENT_NODE)
      for (const a of Array.from(r.childNodes))
        i(a);
  }
  return i(e), t && !o ? null : n;
}
function b(e, n) {
  let t = e;
  for (; t && t !== n; ) {
    if (t.nodeType === Node.ELEMENT_NODE) {
      const o = t;
      if (o.classList.contains(f)) return o;
    }
    t = t.parentNode;
  }
  return null;
}
function x(e) {
  const n = e.querySelector('annotation[encoding="application/x-tex"]');
  if (!n || !n.textContent) return null;
  const t = n.textContent.trim();
  return e.closest(`.${S}`) !== null || e.getAttribute("data-display") === "true" ? `$$${t}$$` : `$${t}$`;
}
function j(e, n) {
  const t = e.querySelector(`[data-src-line="${n}"]`);
  if (t) {
    t.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const o = e.querySelectorAll("[data-src-line]").length || 100, i = Math.min(n / o, 1);
  e.scrollTop = i * (e.scrollHeight - e.clientHeight);
}
function H(e, n) {
  const t = () => {
    var i;
    const o = e.scrollHeight - e.clientHeight;
    o <= 0 || (i = n.onScrollRatio) == null || i.call(n, e.scrollTop / o);
  };
  return e.addEventListener("scroll", t, { passive: !0 }), () => e.removeEventListener("scroll", t);
}
function I(e, n = {}) {
  var y;
  const { html: t = "", theme: o = "auto", onScrollRatio: i } = n, r = document.createElement("style"), a = o === "dark" || o === "auto" && typeof window < "u" && ((y = window.matchMedia) == null ? void 0 : y.call(window, "(prefers-color-scheme: dark)").matches);
  r.textContent = L + `
` + N, e.appendChild(r), e.classList.add("mycelium-preview"), a && e.classList.add("dark"), e.insertAdjacentHTML("beforeend", '<div class="mycelium-view-content"></div>');
  const c = e.querySelector(".mycelium-view-content");
  let l = null, d = null, s = null;
  function u() {
    A(c), O(c), d && (d(), d = null), d = _(c), l && (l(), l = null), l = z(c);
  }
  function p(m) {
    c.innerHTML = m, u();
  }
  return t && p(t), i && (s = H(e, { onScrollRatio: i })), {
    update(m) {
      const $ = e.scrollTop;
      p(m), e.scrollTop = $;
    },
    scrollToLine(m) {
      return j(e, m), e.scrollTop;
    },
    destroy() {
      l == null || l(), d == null || d(), s == null || s(), r.remove(), c.remove(), e.classList.remove("mycelium-preview", "dark");
    }
  };
}
const K = "0.16.47", X = "11.15.0";
export {
  K as KATEX_EXPECTED_VERSION,
  X as MERMAID_EXPECTED_VERSION,
  H as createScrollSync,
  z as enableMathCopyAsTex,
  _ as installCopyButtons,
  I as mountView,
  A as runKaTeX,
  O as runMermaid,
  j as scrollToLine
};
