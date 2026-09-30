/**
 * Minimal JSON Schema (draft 2020-12) subset validator.
 * Supports: type, required, properties, enum, minimum, minLength,
 * items, additionalProperties, $ref to #/$defs/*, type arrays.
 */

/**
 * @param {unknown} data
 * @param {Record<string, unknown>} schema
 * @param {Record<string, unknown>} [root]
 * @param {string} [path]
 * @returns {string[]}
 */
export function validate(data, schema, root = schema, path = '$') {
  /** @type {string[]} */
  const errors = [];

  if (!schema || typeof schema !== 'object') {
    return errors;
  }

  if (schema.$ref && typeof schema.$ref === 'string') {
    const resolved = resolveRef(root, schema.$ref);
    if (!resolved) {
      errors.push(`${path}: unresolved $ref ${schema.$ref}`);
      return errors;
    }
    return validate(data, resolved, root, path);
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(data, type))) {
      errors.push(`${path}: expected type ${types.join('|')}, got ${typeName(data)}`);
      return errors;
    }
  }

  if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(data)) {
    errors.push(`${path}: value not in enum`);
  }

  if (typeof data === 'number' && typeof schema.minimum === 'number' && data < schema.minimum) {
    errors.push(`${path}: must be >= ${schema.minimum}`);
  }

  if (typeof data === 'string' && typeof schema.minLength === 'number' && data.length < schema.minLength) {
    errors.push(`${path}: minLength ${schema.minLength}`);
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!(key in data)) {
        errors.push(`${path}: missing required property "${key}"`);
      }
    }

    const properties =
      schema.properties && typeof schema.properties === 'object'
        ? /** @type {Record<string, Record<string, unknown>>} */ (schema.properties)
        : {};

    for (const [key, childSchema] of Object.entries(properties)) {
      if (key in data) {
        errors.push(...validate(data[key], childSchema, root, `${path}.${key}`));
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!(key in properties)) {
          errors.push(`${path}: additional property "${key}" not allowed`);
        }
      }
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object' &&
      !Array.isArray(schema.additionalProperties)
    ) {
      for (const key of Object.keys(data)) {
        if (!(key in properties)) {
          errors.push(
            ...validate(
              data[key],
              /** @type {Record<string, unknown>} */ (schema.additionalProperties),
              root,
              `${path}.${key}`,
            ),
          );
        }
      }
    }
  }

  if (Array.isArray(data) && schema.items && typeof schema.items === 'object') {
    data.forEach((item, index) => {
      errors.push(
        ...validate(
          item,
          /** @type {Record<string, unknown>} */ (schema.items),
          root,
          `${path}[${index}]`,
        ),
      );
    });
  }

  return errors;
}

/**
 * @param {Record<string, unknown>} root
 * @param {string} ref
 */
function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) {
    return null;
  }

  const parts = ref.slice(2).split('/');
  let cursor = /** @type {unknown} */ (root);

  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor) || !(part in cursor)) {
      return null;
    }
    cursor = /** @type {Record<string, unknown>} */ (cursor)[part];
  }

  return cursor && typeof cursor === 'object' && !Array.isArray(cursor)
    ? /** @type {Record<string, unknown>} */ (cursor)
    : null;
}

/**
 * @param {unknown} value
 * @param {string} type
 */
function matchesType(value, type) {
  switch (type) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'string':
      return typeof value === 'string';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return true;
  }
}

/**
 * @param {unknown} value
 */
function typeName(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
