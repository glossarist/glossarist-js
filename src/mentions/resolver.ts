// Spec-compliant inline mention resolver.
// Per docs/design/inline-mentions-implementation-guide.md §1.2.

import type {
  Mention,
  ResolutionContext,
  ResolvedMention,
  Target,
} from './types.js';

/**
 * Resolve a parsed mention against a ResolutionContext.
 * Returns a ResolvedMention with status indicating the outcome.
 */
export function resolveMention(
  mention: Mention,
  context: ResolutionContext,
): ResolvedMention {
  switch (mention.kind) {
    case 'concept':
      return resolveConceptLike(mention, context, false);
    case 'cite':
      return resolveConceptLike(mention, context, true);
    case 'fig':
    case 'table':
    case 'formula':
      return resolveEntity(mention, context);
    case 'bib':
      return resolveBib(mention, context);
    case 'link':
      return {
        status: 'external',
        kind: 'link',
        label: mention.label,
        url: (mention.target as { url?: string }).url ?? '',
      };
    case 'image':
      return resolveImage(mention);
  }
}

export function resolveAll(
  mentions: ReadonlyArray<Mention>,
  context: ResolutionContext,
): ResolvedMention[] {
  return mentions.map(m => resolveMention(m, context));
}

function resolveConceptLike(
  mention: Mention,
  context: ResolutionContext,
  isCite: boolean,
): ResolvedMention {
  const target = mention.target;
  let concept: unknown;
  if (target.type === 'urn') {
    concept = context.resolveConcept?.({ urn: target.urn }) ?? null;
  } else if (target.type === 'dataset_qualified') {
    concept = context.resolveConcept?.({ dataset: target.dataset, id: target.id }) ?? null;
  } else {
    return {
      status: 'unresolved',
      kind: mention.kind,
      label: mention.label,
      target,
    };
  }

  if (concept == null) {
    return {
      status: 'unresolved',
      kind: mention.kind,
      label: mention.label,
      target,
    };
  }

  let source: unknown = undefined;
  if (isCite && context.concept) {
    source = findMatchingSource(context.concept, target);
  }

  return {
    status: 'resolved',
    kind: mention.kind,
    label: mention.label,
    concept,
    source,
  };
}

function resolveEntity(
  mention: Mention,
  context: ResolutionContext,
): ResolvedMention {
  const target = mention.target;
  if (target.type !== 'entity_id' && target.type !== 'urn') {
    return {
      status: 'unresolved',
      kind: mention.kind,
      label: mention.label,
      target,
    };
  }

  const id = target.type === 'entity_id' ? target.id : '';
  if (!id) {
    return {
      status: 'unresolved',
      kind: mention.kind,
      label: mention.label,
      target,
    };
  }

  const entityKind = mention.kind as 'fig' | 'table' | 'formula';
  const entity = context.resolveEntity?.(entityKind, id) ?? null;
  if (entity == null) {
    return {
      status: 'unresolved',
      kind: mention.kind,
      label: mention.label,
      target,
    };
  }

  return {
    status: 'resolved',
    kind: mention.kind,
    label: mention.label,
    entity,
  };
}

function resolveBib(
  mention: Mention,
  context: ResolutionContext,
): ResolvedMention {
  const target = mention.target;
  if (target.type !== 'entity_id') {
    return {
      status: 'unresolved',
      kind: 'bib',
      label: mention.label,
      target,
    };
  }

  const entry = context.resolveBibEntry?.(target.id) ?? null;
  if (entry == null) {
    return {
      status: 'unresolved',
      kind: 'bib',
      label: mention.label,
      target,
    };
  }

  return {
    status: 'resolved',
    kind: 'bib',
    label: mention.label,
    entry,
  };
}

function resolveImage(mention: Mention): ResolvedMention {
  const target = mention.target;
  if (target.type === 'url') {
    return {
      status: 'external_image',
      kind: 'image',
      label: mention.label,
      url: target.url,
    };
  }
  return {
    status: 'local_image',
    kind: 'image',
    label: mention.label,
    path: (target as { path?: string }).path,
  };
}

function findMatchingSource(
  concept: { sources?: ReadonlyArray<unknown> },
  target: Target,
): unknown {
  if (!concept.sources) return undefined;
  for (const source of concept.sources) {
    const s = source as {
      origin?: { ref?: { source?: string; id?: string } | null };
    };
    const ref = s?.origin?.ref;
    if (!ref) continue;
    if (target.type === 'dataset_qualified') {
      if (ref.source === target.dataset && ref.id === target.id) {
        return source;
      }
    }
  }
  return undefined;
}
