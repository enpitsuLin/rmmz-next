interface BooleanConstructor {
  (): <T>(value: T | null | undefined, index: number, array: (T | null | undefined)[]) => value is NonNullable<T>
}

interface Array<T> {
  /**
   * Makes a shallow copy of the array.
   *
   * @returns {Array} A shallow copy of the array.
   */
  clone: () => Array<T>
  /**
   * Checks whether the array contains a given element.
   *
   * @param {any} element - The element to search for.
   * @returns {boolean} True if the array contains a given element.
   * @deprecated includes() should be used instead.
   */
  contains: (element: any) => boolean
  /**
   * Checks whether the two arrays are the same.
   *
   * @param {Array} array - The array to compare to.
   * @returns {boolean} True if the two arrays are the same.
   */
  equals: (array: Array<any>) => boolean
  /**
   * Removes a given element from the array (in place).
   *
   * @param {any} element - The element to remove.
   * @returns {Array} The array after remove.
   */
  remove: (element: any) => Array<T>
}

interface Math {
  /**
   * Generates a random integer in the range (0, max-1).
   *
   * @memberof JsExtensions
   * @param {number} max - The upper boundary (excluded).
   * @returns {number} A random integer.
   */
  randomInt: (max: number) => number
}

interface Number {
  /**
   * Returns a modulo value which is always positive.
   *
   * @memberof JsExtensions
   * @param {number} n - The divisor.
   * @returns {number} A modulo value.
   */
  mod: (n: number) => number
  /**
   * Returns a number whose value is limited to the given range.
   *
   * @memberof JsExtensions
   * @param {number} min - The lower boundary.
   * @param {number} max - The upper boundary.
   * @returns {number} A number in the range (min, max).
   */
  clamp: (min: number, max: number) => number
  /**
   * Makes a number string with leading zeros.
   *
   * @memberof JsExtensions
   * @param {number} length - The length of the output string.
   * @returns {string} A string with leading zeros.
   */
  padZero: (length: number) => string
}

interface String {
  /**
   * Checks whether the string contains a given string.
   *
   * @memberof JsExtensions
   * @param {string} string - The string to search for.
   * @returns {boolean} True if the string contains a given string.
   * @deprecated includes() should be used instead.
   */
  contains: (string: string) => boolean
  /**
   * Replaces %1, %2 and so on in the string to the arguments.
   *
   * @memberof JsExtensions
   * @param {any} ...args The objects to format.
   * @returns {string} A formatted string.
   */
  format: (...args: any[]) => string
  /**
   * Makes a number string with leading zeros.
   *
   * @memberof JsExtensions
   * @param {number} length - The length of the output string.
   * @returns {string} A string with leading zeros.
   */
  padZero: (length: number) => string
}

interface Object {
  /**
   * Copy the values of all of the enumerable own properties recursively from one or more source objects to a target object.
   * It also works for nested objects.
   *
   * @memberof JsExtensions
   * @param {object} target - The target object to copy to.
   * @param {object} source - The source object from which to copy properties.
   * @returns {object} The target object.
   */
  deepAssign: (target: object, source: object) => object
}
