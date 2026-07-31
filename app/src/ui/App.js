import { useEffect } from 'preact/hooks';
import { html, cx } from './html.js';
import {
  go,
  goPlay,
  cycleTheme,
  requestAbandonRun,
  tick,
  hideHelp,
  markInterrupted,
  openNavMenu,
  me
} from '../state/store.js';
import { HelpPopover, HoverTip } from './Help.js';
import { Modals } from './Modals.js';
import { Home } from './screens/Home.js';
import { Setup } from './screens/Setup.js';
import { Game } from './screens/Game.js';
import { Results } from './screens/Results.js';
import { Leaderboards } from './screens/Leaderboards.js';
import { LeaderboardRecap } from './screens/LeaderboardRecap.js';
import { HowToPlay } from './screens/HowToPlay.js';
import { Settings } from './screens/Settings.js';
import { Lab } from './screens/Lab.js';

const THEME_NAMES = { feltwork: 'Feltwork', midnight: 'Midnight', sandbar: 'Sandbar' };

const NAV = [
  { key: 'home', label: 'Home' },
  { key: 'play', label: 'Play' },
  { key: 'leaderboards', label: 'Leaderboards' },
  { key: 'howto', label: 'How to Play' },
  { key: 'settings', label: 'Settings' }
];

/** What the phone menu button says. The button replaces the row of links, so it
 *  has to answer "where am I?" as well as offer to go elsewhere. */
function currentLabel(screen, inRun) {
  if (screen === 'game' || screen === 'setup') return inRun ? 'Resume game' : 'Play';
  if (screen === 'lab') return 'Settings';
  if (screen === 'leaderboard-recap') return 'Leaderboards';
  const match = NAV.find((n) => n.key === screen);
  return match ? match.label : 'Menu';
}

export function App({ state }) {
  // One interval for the whole app. tick() decides whether this second counts.
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Backgrounding a timed run is recorded rather than silently forgiven. On a
  // phone this fires constantly — app switches, lock screen, notifications — so
  // it goes through the store to be persisted rather than being set on the live
  // object, where the next reload would lose it.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) markInterrupted('backgrounded');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const inRun = !!(state.run && state.turn && !state.run.completedAt);
  const screen = state.screen;
  const isRecap = screen === 'results' || screen === 'leaderboard-recap';

  const screens = {
    home: Home,
    setup: Setup,
    game: Game,
    results: Results,
    leaderboards: Leaderboards,
    'leaderboard-recap': LeaderboardRecap,
    howto: HowToPlay,
    settings: Settings,
    lab: Lab
  };
  const Screen = screens[screen] || Home;

  return html`
    <div class=${cx('app', isRecap && 'is-recap')} onClick=${() => hideHelp()}>
      ${!isRecap && html`<nav class="nav">
        <button
          class="nav-brand"
          type="button"
          onClick=${() => go('home')}
          aria-label="Rack Five — home"
        >
          ${'Rack Five'}
        </button>
        <div class="nav-items">
          ${NAV.map(
            (n) => html`
              <button
                key=${n.key}
                type="button"
                class=${cx(
                  'nav-item',
                  (n.key === 'play'
                    ? screen === 'setup' || screen === 'game'
                    : screen === n.key ||
                      (n.key === 'leaderboards' && screen === 'leaderboard-recap') ||
                      (n.key === 'settings' && screen === 'lab')) && 'is-active'
                )}
                onClick=${() => (n.key === 'play' ? goPlay() : go(n.key))}
                aria-current=${screen === n.key || (n.key === 'leaderboards' && screen === 'leaderboard-recap') ? 'page' : undefined}
              >
                ${n.key === 'play' && inRun ? 'Resume game' : n.label}
                ${n.key === 'play' && inRun && html`<span class="live-dot" />`}
              </button>
            `
          )}
        </div>
        <!-- Phone widths only. The links above need a second nav line to fit,
             which costs the board more height than it can spare, so there they
             collapse into this and the sheet behind it. -->
        <button class="nav-menu-btn" type="button" onClick=${openNavMenu}>
          <span class="nav-menu-icon" aria-hidden="true"></span>
          ${currentLabel(screen, inRun)}
        </button>
        <div class="nav-right">
          ${inRun &&
          html`
            <button class="nav-quit-btn" type="button" onClick=${requestAbandonRun}>
              Abandon run
            </button>
          `}
          <span class="nav-theme-name">${THEME_NAMES[state.settings.theme]}</span>
          <button class="nav-theme-btn" type="button" onClick=${cycleTheme}>Switch theme</button>
        </div>
      </nav>`}

      <${Screen} state=${state} />

      <${Modals} state=${state} />
      <${HelpPopover} tip=${state.helpTip} />
      <${HoverTip} tip=${state.hoverTip} />
      ${state.toast &&
      html`
        <div class="toast" role="status">
          <span>${state.toast.message}</span>
          ${state.toast.action &&
          html`
            <button class="toast-action" type="button" onClick=${state.toast.action.onClick}>
              ${state.toast.action.label}
            </button>
          `}
        </div>
      `}
    </div>
  `;
}

export { me };
