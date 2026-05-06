import { createHash } from 'crypto';

const NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export function uuidV5(namespace, name) {
  const ns = _parseUuid(namespace);
  const hash = createHash('sha1').update(ns).update(name, 'utf8').digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return _formatUuid(hash);
}

export function conceptUuid(conceptId, namespace = NAMESPACE_UUID) {
  return uuidV5(namespace, conceptId);
}

export function localizedConceptUuid(conceptId, languageCode, namespace = NAMESPACE_UUID) {
  return uuidV5(namespace, `${conceptId}:${languageCode}`);
}

function _parseUuid(str) {
  return Buffer.from(str.replace(/-/g, ''), 'hex');
}

function _formatUuid(hash) {
  const h = hash.toString('hex');
  return [h.slice(0, 8), h.slice(8, 12), h.slice(12, 16), h.slice(16, 20), h.slice(20, 32)].join('-');
}
