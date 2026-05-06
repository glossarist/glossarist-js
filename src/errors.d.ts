export class GlossaristError extends Error {
  constructor(message: string, options?: { cause?: Error });
}

export class InvalidInputError extends GlossaristError {
  constructor(what: string, expected?: string);
}

export class YamlParseError extends GlossaristError {
  constructor(context: string, cause: Error);
}
