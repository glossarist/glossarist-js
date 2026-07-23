// Enum factory — produces a frozen KEY/VALUES bundle, a frozen values
// array, and an isValid* predicate from a single `makeEnum` call.
//
// Adding a new enum means one line:
//
//   export const COLOR = makeEnum('COLOR', { RED: 'red', BLUE: 'blue' });
//
// The factory returns:
//   {
//     CLOSED: 'closed',           // exposed by destructuring
//     OPEN:   'open',
//     VALUES: ['closed', 'open'],  // frozen array
//     isValid: (v) => boolean,     // predicate
//   }
//
// We attach the bundle via Object.assign on a frozen object so the
// bundle is itself frozen and exposes both the per-value constants
// (CLOSED, OPEN, ...) and the VALUES list + isValid predicate.

export function makeEnum(name, values) {
  if (typeof name !== 'string') {
    throw new Error(`makeEnum: name must be a string, got ${typeof name}`);
  }
  if (typeof values !== 'object' || values === null) {
    throw new Error(`makeEnum: values must be an object, got ${typeof values}`);
  }
  for (const [k, v] of Object.entries(values)) {
    if (typeof v !== 'string') {
      throw new Error(`makeEnum(${name}): value for ${k} must be a string, got ${typeof v}`);
    }
  }

  const frozen = Object.freeze({ ...values });
  const valuesArr = Object.freeze(Object.values(frozen));
  const isValid = (v) => valuesArr.includes(v);

  return Object.assign(Object.create(null), frozen, {
    name,
    VALUES: valuesArr,
    isValid,
  });
}
