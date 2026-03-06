/**
 * A JSON-compatible value: primitives, arrays, or plain objects.
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * A record-like structure used during encode/decode traversal.
 */
type JsonRecord = Record<string, JsonValue>

/**
 * Represents a constructor-like value retrieved from the global scope.
 */
interface ConstructorRef {
  prototype: object
}

/**
 * Checks whether a value is a traversable JSON record (plain object or array).
 */
function isTraversable(value: unknown): value is JsonRecord {
  const tag = Object.prototype.toString.call(value)
  return tag === '[object Object]' || tag === '[object Array]'
}

/**
 * The static class that handles JSON with object information.
 *
 * @namespace
 */
export class JsonEx {
  constructor() {
    throw new Error('This is a static class')
  }

  /**
   * The maximum depth of objects.
   *
   * @default 100
   */
  static maxDepth = 100

  /**
   * Converts an object to a JSON string with object information.
   *
   * @param object - The object to be converted.
   * @returns The JSON string.
   */
  static stringify(object: unknown): string {
    return JSON.stringify(this._encode(object, 0))
  }

  /**
   * Parses a JSON string and reconstructs the corresponding object.
   *
   * @param json - The JSON string.
   * @returns The reconstructed object.
   */
  static parse(json: string): unknown {
    return this._decode(JSON.parse(json) as JsonValue)
  }

  /**
   * Makes a deep copy of the specified object.
   *
   * @param object - The object to be copied.
   * @returns The copied object.
   */
  static makeDeepCopy<T extends object>(object: T): T {
    return this.parse(this.stringify(object)) as T
  }

  static _encode(value: unknown, depth: number): unknown {
    // [Note] The handling code for circular references in certain versions of
    //   MV has been removed because it was too complicated and expensive.
    if (depth >= this.maxDepth) {
      throw new Error('Object too deep')
    }
    if (isTraversable(value)) {
      const constructorName = value.constructor.name
      if (constructorName !== 'Object' && constructorName !== 'Array') {
        value['@'] = constructorName
      }
      for (const key of Object.keys(value)) {
        value[key] = this._encode(value[key], depth + 1) as JsonValue
      }
    }
    return value
  }

  static _decode(value: JsonValue): unknown {
    if (isTraversable(value)) {
      const tag = value['@']
      if (typeof tag === 'string') {
        const ctor = (window as unknown as Record<string, ConstructorRef | undefined>)[tag]
        if (ctor) {
          Object.setPrototypeOf(value, ctor.prototype)
        }
      }
      for (const key of Object.keys(value)) {
        value[key] = this._decode(value[key]) as JsonValue
      }
    }
    return value
  }
}
