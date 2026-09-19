import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

// Run against an already built local server. Separate browser contexts keep
// fixtures, cache, viewport and motion phase comparable between checkpoints.
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Choose before or after');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3025';
const output = `${process.env.CAPTURE_ROOT || "docs/screenshots/layering"}/${phase}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const report = [];
try {
  for (const [size, viewport] of Object.entries({ desktop: { width: 1440, height: 900 }, wide: { width: 1920, height: 1080 }, mobile: { width: 390, height: 844 } })) {
    for (const [name, route] of [['overview', '/field'], ['missions', '/missions'], ['agents', '/agents']]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const assets = [];
      const requests = [];
      page.on('response', response => {
        if (/\.(js|css)(\?|$)/.test(response.url())) requests.push((async () => {
          const body = await response.body();
          assets.push({ type: response.url().match(/\.(js|css)(\?|$)/)[1], bytes: body.length, gzip: gzipSync(body).length });
        })());
      });
      await page.goto(base + route);
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole('heading', { name: name[0].toUpperCase() + name.slice(1), exact: true }).waitFor();
      const timing = await page.evaluate(() => new Promise(resolve => {
        const intervals = [];
        let previous;
        const sample = now => {
          if (previous !== undefined) intervals.push(now - previous);
          previous = now;
          if (intervals.length < 120) requestAnimationFrame(sample);
          else {
            intervals.sort((a, b) => a - b);
            const selectors = ['.sidebar', '.workspace-topbar', '.page-heading', '.agents-heading', '.mission-work', '.review-callout', '.mission-list', '.agents-constellation'];
            resolve({ frameMedianMs: intervals[60], frameP95Ms: intervals[114], framesOver34Ms: intervals.filter(n => n > 34).length,
              overflow: document.documentElement.scrollWidth > innerWidth,
              geometry: Object.fromEntries(selectors.flatMap(selector => {
                const el = document.querySelector(selector); if (!el) return [];
                const r = el.getBoundingClientRect(); return [[selector, { x: r.x, y: r.y, width: r.width, height: r.height }]];
              })) });
          }
        };
        requestAnimationFrame(sample);
      }));
      // Keep the background in its initial phase for matched still comparisons.
      await page.evaluate(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }));
      await page.screenshot({ path: `${output}/${name}-${size}.png`, fullPage: true });
      await Promise.all(requests);
      report.push({ name, size, viewport, ...timing, assets: Object.fromEntries(['js', 'css'].map(type => [type, assets.filter(a => a.type === type).reduce((total, a) => ({ count: total.count + 1, bytes: total.bytes + a.bytes, gzip: total.gzip + a.gzip }), { count: 0, bytes: 0, gzip: 0 })])) });
      await context.close();
    }
  }
  await writeFile(`${output}/measurements.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.map(({ name, size, frameMedianMs, frameP95Ms, framesOver34Ms, assets, overflow }) => ({ name, size, frameMedianMs, frameP95Ms, framesOver34Ms, assets, overflow })), null, 2));
} finally { await browser.close(); }
