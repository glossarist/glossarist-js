/** Base error for all glossarist errors. */
export class GlossaristError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = 'GlossaristError';
  }
}

/** Thrown when a function receives invalid input (null, undefined, wrong type). */
export class InvalidInputError extends GlossaristError {
  constructor(what: string, expected?: string) {
    const msg = expected ? `${what} (expected ${expected})` : what;
    super(msg);
    this.name = 'InvalidInputError';
  }
}

/** Thrown when YAML content cannot be parsed. */
export class YamlParseError extends GlossaristError {
  constructor(context: string, cause: Error) {
    super(`Failed to parse YAML for ${context}: ${cause.message}`, { cause });
    this.name = 'YamlParseError';
  }
}
