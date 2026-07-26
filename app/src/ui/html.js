// Preact + htm, bound once. Tagged templates mean no JSX and therefore no build
// step, while keeping real keyed reconciliation, controlled inputs and hooks.
import { h } from 'preact';
import htm from 'htm';

export const html = htm.bind(h);
export { Fragment } from 'preact';

/** Join class names, dropping falsy entries. */
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
