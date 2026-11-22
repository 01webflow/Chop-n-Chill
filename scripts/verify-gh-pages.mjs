#!/usr/bin/env node
/**
 * GitHub Pages Asset & Network Waterfall Diagnostic Script
 *
 * Inspects dist/index.html base-path injection and launches headless Chromium via CDP
 * to capture the real network waterfall (HTML, JS modules, CSS stylesheets, images),
 * runtime console errors, and rendered DOM state.
 *
 * Usage:
 *   node scripts/verify-gh-pages.mjs
 *   node scripts/verify-gh-pages.mjs --subpath /Chop-n-Chill/
 *   node scripts/verify-gh-pages.mjs --url https://01webflow.github.io/Chop-n-Chill/
 */
import { spawn } from 'child_process';
import express from 'express';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const targetUrlArg = getArg('--url', '');
const subpathArg = getArg('--subpath', '/Chop-n-Chill/');
const normalizedSubpath = subpathArg.startsWith('/') ? subpathArg : `/${subpathArg}`;
const distDir = path.resolve(process.cwd(), 'dist');

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);

  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }

  const msRoot = '/ms-playwright';
  if (fs.existsSync(msRoot)) {
    for (const dir of fs.readdirSync(msRoot)) {
      const candidate = path.join(msRoot, dir, 'chrome-headless-shell-linux64', 'chrome-headless-shell');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function inspectBuiltHtmlAndBundles() {
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Missing built index.html at ${indexPath}. Run "npm run build" first.`);
  }

  const html = fs.readFileSync(indexPath, 'utf8');
  const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const preloadHrefs = [...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1]
  );
  const styleHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(
    (m) => m[1]
  );

  const hasUnbuiltSourceEntry = scriptSrcs.some((s) => s.includes('/src/main.tsx'));
  const usesRootAbsoluteAssets = [...scriptSrcs, ...preloadHrefs, ...styleHrefs].some((ref) =>
    ref.startsWith('/assets/')
  );

  const nojekyllExists = fs.existsSync(path.join(distDir, '.nojekyll'));
  const assetFilesExist = [...scriptSrcs, ...preloadHrefs, ...styleHrefs].map((ref) => {
    const clean = ref.replace(/^\.\//, '').replace(/^\//, '');
    const resolved = path.join(distDir, clean);
    return { ref, exists: fs.existsSync(resolved) };
  });

  // Check injected BASE_URL inside main entry chunk
  let detectedInjectedBase = 'unknown';
  for (const s of scriptSrcs) {
    const clean = s.replace(/^\.\//, '').replace(/^\//, '');
    const full = path.join(distDir, clean);
    if (fs.existsSync(full)) {
      const js = fs.readFileSync(full, 'utf8');
      const baseMatch = js.match(/function resolvePublicAssetUrl[\s\S]{0,400}?const base\s*=\s*["'`]([^"'`]+)["'`]/);
      if (baseMatch?.[1]) {
        detectedInjectedBase = baseMatch[1];
      } else if (js.includes('`./`.endsWith(`/`)') || s.startsWith('./')) {
        detectedInjectedBase = './';
      } else if (js.includes('`/Chop-n-Chill/`.endsWith(`/`)') || s.startsWith('/Chop-n-Chill/')) {
        detectedInjectedBase = '/Chop-n-Chill/';
      }
    }
  }

  return {
    scriptSrcs,
    preloadHrefs,
    styleHrefs,
    hasUnbuiltSourceEntry,
    usesRootAbsoluteAssets,
    nojekyllExists,
    assetFilesExist,
    detectedInjectedBase,
  };
}

async function runWaterfallAudit(targetUrl) {
  const chromeBin = findChromeBinary();
  if (!chromeBin) {
    throw new Error('Headless Chromium binary not found. Set CHROME_BIN to inspect network waterfall.');
  }

  const debugPort = 9235 + Math.floor(Math.random() * 100);
  const chrome = spawn(
    chromeBin,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--window-size=1440,900',
      `--remote-debugging-port=${debugPort}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    let targets = null;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
        if (Array.isArray(targets) && targets[0]?.webSocketDebuggerUrl) break;
      } catch {
        // wait for CDP port
      }
    }
    if (!targets?.[0]?.webSocketDebuggerUrl) {
      throw new Error('Timed out connecting to Chrome DevTools Protocol.');
    }

    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    let msgId = 1;
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const id = msgId++;
        const onMessage = (raw) => {
          const parsed = JSON.parse(raw.toString());
          if (parsed.id === id) {
            ws.off('message', onMessage);
            resolve(parsed);
          }
        };
        ws.on('message', onMessage);
        ws.send(JSON.stringify({ id, method, params }));
      });

    const requests = new Map();
    const consoleErrors = [];
    const pageExceptions = [];

    ws.on('message', (raw) => {
      const m = JSON.parse(raw.toString());
      if (m.method === 'Network.requestWillBeSent') {
        requests.set(m.params.requestId, {
          url: m.params.request.url,
          type: m.params.type || 'Other',
          startTs: m.params.timestamp,
          status: null,
          mimeType: '',
          encodedBytes: 0,
          failedText: '',
          durationMs: null,
        });
      } else if (m.method === 'Network.responseReceived') {
        const entry = requests.get(m.params.requestId);
        if (entry) {
          entry.status = m.params.response.status;
          entry.mimeType = m.params.response.mimeType || '';
          entry.type = m.params.type || entry.type;
        }
      } else if (m.method === 'Network.loadingFinished') {
        const entry = requests.get(m.params.requestId);
        if (entry) {
          entry.encodedBytes = m.params.encodedDataLength || 0;
          entry.durationMs = Math.round((m.params.timestamp - entry.startTs) * 1000);
        }
      } else if (m.method === 'Network.loadingFailed') {
        const entry = requests.get(m.params.requestId);
        if (entry) {
          entry.failedText = m.params.errorText || 'Failed';
        }
      } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
      } else if (m.method === 'Runtime.exceptionThrown') {
        pageExceptions.push(
          m.params.exceptionDetails?.exception?.description ||
            m.params.exceptionDetails?.text ||
            'Uncaught exception'
        );
      }
    });

    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: targetUrl });

    await new Promise((r) => setTimeout(r, 3800));

    const domEval = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        href: location.href,
        baseURI: document.baseURI,
        title: document.title,
        rootLength: document.getElementById('root')?.innerHTML.length || 0,
        bodyBg: getComputedStyle(document.body).backgroundColor,
        h1: document.querySelector('h1')?.textContent || '',
        scripts: [...document.scripts].map(s => s.getAttribute('src')).filter(Boolean),
        stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href')).filter(Boolean),
        imagesLoaded: [...document.images].filter(i => i.complete && i.naturalWidth > 0).length,
        imagesTotal: document.images.length
      })`,
    });

    ws.close();

    const domState = JSON.parse(domEval.result?.result?.value || '{}');
    const waterfall = [...requests.values()];
    return { domState, waterfall, consoleErrors, pageExceptions };
  } finally {
    chrome.kill();
  }
}

async function main() {
  console.log('=== Chop \'n Chill — GitHub Pages Build & Network Waterfall Audit ===');

  const staticAudit = inspectBuiltHtmlAndBundles();
  console.log('\n[1] Static dist/index.html & Base Path Check:');
  console.log('  - Vite BASE_URL compiled into bundle :', staticAudit.detectedInjectedBase);
  console.log('  - .nojekyll present in dist/         :', staticAudit.nojekyllExists);
  console.log('  - Unbuilt /src/main.tsx detected     :', staticAudit.hasUnbuiltSourceEntry);
  console.log('  - Root-absolute /assets/ detected    :', staticAudit.usesRootAbsoluteAssets);
  for (const item of staticAudit.assetFilesExist) {
    console.log(`  - Asset ref ${item.ref} -> ${item.exists ? 'OK (on disk)' : 'MISSING'}`);
  }

  let server = null;
  let auditUrl = targetUrlArg;

  try {
    if (!auditUrl) {
      const app = express();
      const mountPath = normalizedSubpath.endsWith('/')
        ? normalizedSubpath.slice(0, -1)
        : normalizedSubpath;
      app.use(mountPath || '/', express.static(distDir));
      server = await new Promise((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      const addr = server.address();
      auditUrl = `http://127.0.0.1:${addr.port}${normalizedSubpath}`;
    }

    console.log(`\n[2] Running Headless Chromium Network Waterfall against: ${auditUrl}`);
    const { domState, waterfall, consoleErrors, pageExceptions } = await runWaterfallAudit(auditUrl);

    console.log('\n[3] Network Waterfall:');
    for (const req of waterfall) {
      const statusLabel = req.failedText
        ? `ERR(${req.failedText})`
        : String(req.status ?? 'PENDING');
      const kb = req.encodedBytes ? `${(req.encodedBytes / 1024).toFixed(1)}KB` : '-';
      const ms = req.durationMs !== null ? `${req.durationMs}ms` : '-';
      console.log(
        `  [${req.type.padEnd(10)}] ${statusLabel.padEnd(6)} ${kb.padStart(8)} ${ms.padStart(6)}  ${req.url}`
      );
    }

    console.log('\n[4] Rendered DOM & Theme Verification:');
    console.log('  - URL            :', domState.href);
    console.log('  - baseURI        :', domState.baseURI);
    console.log('  - #root bytes    :', domState.rootLength);
    console.log('  - body bg        :', domState.bodyBg);
    console.log('  - Heading (H1)   :', domState.h1);
    console.log('  - Images loaded  :', `${domState.imagesLoaded}/${domState.imagesTotal}`);
    console.log('  - Console errors :', consoleErrors.length);
    console.log('  - Page exceptions:', pageExceptions.length);

    const coreFailures = waterfall.filter((r) => {
      const isCoreType = r.type === 'Document' || r.type === 'Script' || r.type === 'Stylesheet';
      const isAppOrigin = r.url.startsWith(new URL(auditUrl).origin);
      return isCoreType && isAppOrigin && (Boolean(r.failedText) || (r.status !== null && r.status >= 400));
    });

    const isServingUnbuiltSource = (domState.scripts || []).some((s) => s.includes('/src/main.tsx'));
    if (isServingUnbuiltSource) {
      console.error(
        '\n[DIAGNOSIS] Target URL is serving unbuilt source HTML (<script src="/src/main.tsx">). Configure GitHub Pages Source -> GitHub Actions to deploy dist/.'
      );
    }

    if (
      staticAudit.hasUnbuiltSourceEntry ||
      staticAudit.assetFilesExist.some((a) => !a.exists) ||
      coreFailures.length > 0 ||
      pageExceptions.length > 0 ||
      domState.rootLength === 0
    ) {
      console.error('\n[FAIL] GitHub Pages verification detected loading issues.');
      if (coreFailures.length > 0) console.error('Core resource failures:', coreFailures);
      if (pageExceptions.length > 0) console.error('Uncaught exceptions:', pageExceptions);
      process.exitCode = 1;
    } else {
      console.log('\n[PASS] index.html, JS modules, CSS stylesheets, and DOM hydration verified cleanly.');
    }
  } finally {
    if (server) server.close();
  }
}

main().catch((err) => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
