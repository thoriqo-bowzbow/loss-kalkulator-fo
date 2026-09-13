import type { Topology } from './types';

const PREFIX = '#/calc=';

function encodeTopology(topology: Topology): string {
  const json = JSON.stringify(topology);
  return btoa(unescape(encodeURIComponent(json)));
}

export function buildShareUrl(topology: Topology): string {
  const base = window.location.href.split('#')[0];
  return `${base}${PREFIX}${encodeTopology(topology)}`;
}

/** Reads a topology from the current URL hash, or null when absent/invalid. */
export function readTopologyFromUrl(): Topology | null {
  const hash = window.location.hash;
  if (!hash.startsWith(PREFIX)) return null;
  try {
    const json = decodeURIComponent(escape(atob(hash.slice(PREFIX.length))));
    const parsed = JSON.parse(json) as Topology;
    if (typeof parsed.txPower !== 'number' || !Array.isArray(parsed.segments)) return null;
    return parsed;
  } catch {
    return null;
  }
}
