// Boot. Load the versioned ruleset first — every other module reads from it.

import { render } from 'preact';
import { html } from './ui/html.js';
import { loadStandardRuleset } from './engine/ruleset.js';
import { initStore, getState, subscribe } from './state/store.js';
import { App } from './ui/App.js';

const root = document.getElementById('root');

function paintFatal(message) {
  root.innerHTML =
    '<div style="max-width:520px;margin:14vh auto;padding:26px 28px;border:1px solid rgba(233,201,138,.34);border-radius:10px;background:rgba(0,0,0,.24);font-family:system-ui,sans-serif;color:#ece7dc">' +
    '<h1 style="margin:0 0 10px;font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:#e9c98a">Rack Five</h1>' +
    '<p style="margin:0 0 8px;line-height:1.55">' +
    message +
    '</p>' +
    '<p style="margin:0;font-size:13px;color:#8fa39a">Rack Five is a set of ES modules, so it must be served over http rather than opened from the file system. Run <code>serve.cmd</code> in this folder and open the address it prints.</p>' +
    '</div>';
}

async function boot() {
  try {
    await loadStandardRuleset();
  } catch (err) {
    paintFatal('The gameplay ruleset could not be loaded, so the game cannot start.');
    console.error(err);
    return;
  }

  initStore();
  const draw = () => render(html`<${App} state=${getState()} />`, root);
  subscribe(draw);
  draw();
}

boot();
