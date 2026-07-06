// Deterministic blank node ID strategy.
//
// Single source of truth for bnode IDs across all emitters. Previously
// each emitter had its own local FNV-1a hash, producing different IDs
// for the same logical bnode. This module replaces those with one
// strategy: MD5 (via node:crypto) when available, FNV-1a fallback for
// browser bundles.
//
// Browser safety: node:crypto is loaded lazily via runtime check so
// bundlers don't tree-shake the import into the browser bundle.

let nodeCreateHash = null;
let nodeCryptoChecked = false;

function getNodeCreateHash() {
  if (nodeCryptoChecked) return nodeCreateHash;
  nodeCryptoChecked = true;
  try {
    let requireFn;
    try {
      const mod = (Function('m', 'return require(m)'))('node:module');
      requireFn = mod.createRequire(import.meta.url);
    } catch {
      requireFn = (m) => (Function('m', 'return require(m)'))(m);
    }
    const crypto = requireFn('node:crypto');
    nodeCreateHash = crypto.createHash.bind(crypto);
  } catch {
    nodeCreateHash = null;
  }
  return nodeCreateHash;
}

function fnv1a(seed) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function deterministicBnodeId(...parts) {
  const seed = parts.filter(p => p != null && p !== '').join('|');
  if (!seed) return `b${fnv1a('empty')}`;
  const createHash = getNodeCreateHash();
  if (createHash) {
    try {
      return createHash('md5').update(seed).digest('hex').slice(0, 12);
    } catch {
      // fall through to FNV
    }
  }
  return `b${fnv1a(seed)}`;
}
