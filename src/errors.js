/**
 * Base error for all glossarist errors.
 */
export class GlossaristError extends Error {
  /**
   * @param {string} message
   * @param {{ cause?: Error }} [options]
   */
  constructor(message, options) {
    super(message, options);
    this.name = 'GlossaristError';
  }
}

/**
 * Thrown when a function receives invalid input (null, undefined, wrong type).
 */
export class InvalidInputError extends GlossaristError {
  /**
   * @param {string} what - description of the invalid input
   * @param {string} [expected] - description of what was expected
   */
  constructor(what, expected) {
    const msg = expected ? `${what} (expected ${expected})` : what;
    super(msg);
    this.name = 'InvalidInputError';
  }
}

/**
 * Thrown when YAML content cannot be parsed.
 */
export class YamlParseError extends GlossaristError {
  /**
   * @param {string} context - what was being parsed (e.g. concept ID)
   * @param {Error} cause - the original YAML parse error
   */
  constructor(context, cause) {
    super(`Failed to parse YAML for ${context}: ${cause.message}`, { cause });
    this.name = 'YamlParseError';
  }
}
