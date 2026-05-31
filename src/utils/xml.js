/**
 * Return the text payload for XML-to-JSON values that store content under
 * `#text`, while leaving primitive values unchanged.
 */
export function unwrap(v) {
  return v && typeof v === 'object' && '#text' in v ? v['#text'] : v
}
