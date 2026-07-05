import { createHash } from 'node:crypto';

// 12-char hex prefix, mirroring glossarist-ruby's
// `Digest::MD5.hexdigest(content)[0..11]`. Same content → same ID across
// processes, machines, and language runtimes (Ruby vs JS).
export function deterministicId(...parts) {
  const seed = parts.filter(p => p !== null && p !== undefined).join('|');
  return createHash('md5').update(seed).digest('hex').slice(0, 12);
}

// Stable blank-node label for an RDF fragment identified by its parent
// subject + role + index. Useful for reified resources like DetailedDefinition,
// Designation, ConceptSource where the bnode ID must be deterministic to
// produce byte-equivalent Turtle across runs.
export function deterministicBnode(subject, role, index) {
  return `_:b${deterministicId(subject, role, index)}`;
}
