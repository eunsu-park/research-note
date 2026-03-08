import { Marp } from "@marp-team/marp-core";

export interface MarpRenderResult {
  html: string;
  css: string;
  slideCount: number;
}

/** Render Marp markdown to HTML + CSS */
export function renderMarp(content: string): MarpRenderResult {
  const marp = new Marp({
    html: true,
    math: true,
  });

  const { html, css } = marp.render(content);
  const slideCount = (html.match(/<section[\s>]/g) || []).length;

  return { html, css, slideCount };
}

/** Build a complete HTML document for iframe preview (slides stacked vertically) */
export function buildMarpDocument(
  result: MarpRenderResult,
  options?: { dark?: boolean }
): string {
  const isDark = options?.dark ?? false;
  return `<!DOCTYPE html>
<html data-theme="${isDark ? "dark" : "light"}">
<head>
<meta charset="utf-8">
<style>${result.css}</style>
<style>
  html[data-theme="light"] body { background: #f0f0f0; }
  html[data-theme="dark"] body { background: #1a1a1a; }
  body { margin: 0; padding: 16px; }
  section {
    margin: 0 auto 16px auto;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
</style>
<script>
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'marp-theme-change') {
      document.documentElement.setAttribute('data-theme', e.data.dark ? 'dark' : 'light');
    }
  });
</script>
</head>
<body>${result.html}</body>
</html>`;
}

/** Build a presentation-mode HTML document (single slide visible with navigation) */
export function buildMarpPresentation(result: MarpRenderResult): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${result.css}</style>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: #000;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
  section {
    display: none !important;
    transform-origin: 0 0;
  }
  section.active {
    display: block !important;
  }
</style>
<script>
  let currentSlide = 0;
  const slides = [];

  function rescale() {
    const active = slides[currentSlide];
    if (!active) return;
    const sw = active.offsetWidth;
    const sh = active.offsetHeight;
    if (!sw || !sh) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / sw, vh / sh);
    const ox = (vw - sw * scale) / 2;
    const oy = (vh - sh * scale) / 2;
    active.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + scale + ')';
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('section').forEach(s => {
      s.style.position = 'absolute';
      s.style.top = '0';
      s.style.left = '0';
      slides.push(s);
    });
    if (slides.length) {
      slides[0].classList.add('active');
      rescale();
    }
    updateParent();
  });

  window.addEventListener('resize', rescale);

  function goTo(n) {
    if (n < 0 || n >= slides.length) return;
    slides[currentSlide].classList.remove('active');
    currentSlide = n;
    slides[currentSlide].classList.add('active');
    rescale();
    updateParent();
  }

  function updateParent() {
    window.parent.postMessage({
      type: 'marp-slide-change',
      current: currentSlide,
      total: slides.length
    }, '*');
  }

  window.addEventListener('message', (e) => {
    if (e.data.type === 'marp-navigate') goTo(e.data.slide);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      goTo(currentSlide + 1);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goTo(currentSlide - 1);
    }
  });

  document.addEventListener('click', (e) => {
    if (e.clientX > window.innerWidth / 2) goTo(currentSlide + 1);
    else goTo(currentSlide - 1);
  });
</script>
</head>
<body>${result.html}</body>
</html>`;
}
