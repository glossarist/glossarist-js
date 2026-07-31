// Enum factory — produces a frozen KEY/VALUES bundle, a frozen values
// array, and an isValid predicate from a single `makeEnum` call.
//
// Adding a new enum means one line:
//
//   export const COLOR = makeEnum('COLOR', { RED: 'red', BLUE: 'blue' });
//
// The factory returns an object that exposes both the per-value
// constants (COLOR.RED, COLOR.BLUE) and the VALUES list + isValid
// predicate. The bundle is itself frozen.

/**
 * Output of {@link makeEnum}. Captures both the original key→value
 * pairs (so `MY_ENUM.MY_KEY` is the literal string value) and the
 * helper properties (`name`, `VALUES`, `isValid`).
 */
export type EnumBundle<TValues extends Readonly<Record<string, string>>> = {
  readonly name: string;
  readonly VALUES: ReadonlyArray<TValues[keyof TValues]>;
  readonly isValid: (value: unknown) => value is TValues[keyof TValues];
} & { readonly [K in keyof TValues]: TValues[K] };

/**
 * Build a frozen enum bundle.
 *
 * @param name Human-readable name used in error messages.
 * @param values Object whose keys are the constant names and whose
 *   string values are the wire representations.
 */
export function makeEnum<const TValues extends Readonly<Record<string, string>>>(
  name: string,
  values: TValues,
): EnumBundle<TValues> {
  if (typeof name !== 'string') {
    throw new Error(`makeEnum: name must be a string, got ${typeof name}`);
  }
  if (typeof values !== 'object' || values === null) {
    throw new Error(`makeEnum: values must be an object, got ${typeof values}`);
  }
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== 'string') {
      throw new Error(
        `makeEnum(${name}): value for ${k} must be a string, got ${typeof v}`,
      );
    }
  }

  const frozen = Object.freeze({ ...values });
  const valuesArr = Object.freeze(Object.values(frozen)) as ReadonlyArray<
    TValues[keyof TValues]
  >;
  const isValid = (v: unknown): v is TValues[keyof TValues] =>
    typeof v === 'string' && (valuesArr as readonly string[]).includes(v);

  return Object.assign(Object.create(null) as object, frozen, {
    name,
    VALUES: valuesArr,
    isValid,
  }) as EnumBundle<TValues>;
}
