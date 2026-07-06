// Stable ID helpers for RDF emission. Mirrors glossarist-ruby's
// Digest::MD5.hexdigest(content)[0..11] for cross-runtime stability.
//
// Browser safety: node:crypto is loaded lazily so bundlers don't
// tree-shake the import into browser bundles. The runtime check uses
// `createRequire` from `node:module` (also lazy) which is the
// documented way to use CommonJS `require` from ESM.

let nodeCreateHash = null;
let nodeCryptoChecked = false;

function getNodeCreateHash() {
  if (nodeCryptoChecked) return nodeCreateHash;
  nodeCryptoChecked = true;
  try {
    // Lazy require — works in both CJS and ESM (Node ≥ 12).
    // Wrapped in Function() so bundlers don't statically resolve it.
    let requireFn;
    try {
      // ESM: use createRequire from node:module
      const mod = (Function('m', 'return require(m)'))('node:module');
      requireFn = mod.createRequire(import.meta.url);
    } catch {
      // CJS or already-require-available environment
      requireFn = (m) => (Function('m', 'return require(m)'))(m);
    }
    const crypto = requireFn('node:crypto');
    nodeCreateHash = crypto.createHash.bind(crypto);
  } catch {
    nodeCreateHash = null;
  }
  return nodeCreateHash;
}

// 12-char hex prefix, mirroring glossarist-ruby's
// `Digest::MD5.hexdigest(content)[0..11]`. Same content → same ID across
// processes, machines, and language runtimes (Ruby vs JS) when MD5 is
// available. Falls back to a 12-char FNV-1a hash in the browser.
export function deterministicId(...parts) {
  const seed = parts.filter(p => p !== null && p !== undefined).join('|');
  const createHash = getNodeCreateHash();
  if (createHash) {
    return createHash('md5').update(seed).digest('hex').slice(0, 12);
  }
  return fnv1a12(seed);
}

// Stable blank-node label for an RDF fragment identified by its parent
// subject + role + index.
export function deterministicBnode(subject, role, index) {
  return `_:b${deterministicId(subject, role, index)}`;
}

// 12-char FNV-1a hash. Two 32-bit passes concatenated and truncated.
// Not as collision-resistant as MD5 but adequate for bnode IDs in a
// single document. Used only when node:crypto is unavailable.
function fnv1a12(seed) {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  const seed2 = `${seed}|fnv2`;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < seed2.length; i++) {
    h2 ^= seed2.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0')
    + (h2 >>> 0).toString(16).padStart(8, '0')).slice(0, 12);
}
