/**
 * Makes a shallow copy of the array.
 *
 * @memberof JsExtensions
 * @returns {array} A shallow copy of the array.
 */
Array.prototype.clone = function () {
  return this.slice(0);
};

/**
 * Checks whether the array contains a given element.
 *
 * @memberof JsExtensions
 * @param {any} element - The element to search for.
 * @returns {boolean} True if the array contains a given element.
 * @deprecated includes() should be used instead.
 */
Array.prototype.contains = function (element) {
  return this.includes(element);
};

/**
 * Checks whether the two arrays are the same.
 *
 * @memberof JsExtensions
 * @param {array} array - The array to compare to.
 * @returns {boolean} True if the two arrays are the same.
 */
Array.prototype.equals = function (array) {
  if (!array || this.length !== array.length) {
    return false;
  }
  for (let i = 0; i < this.length; i++) {
    if (this[i] instanceof Array && array[i] instanceof Array) {
      if (!this[i].equals(array[i])) {
        return false;
      }
    } else if (this[i] !== array[i]) {
      return false;
    }
  }
  return true;
};

Object.defineProperty(Array.prototype, "equals", {
  enumerable: false,
});

/**
 * Removes a given element from the array (in place).
 *
 * @memberof JsExtensions
 * @param {any} element - The element to remove.
 * @returns {array} The array after remove.
 */
Array.prototype.remove = function (element) {
  for (; ;) {
    const index = this.indexOf(element);
    if (index >= 0) {
      this.splice(index, 1);
    } else {
      return this;
    }
  }
};

Object.defineProperty(Array.prototype, "remove", {
  enumerable: false,
});

/**
 * Generates a random integer in the range (0, max-1).
 *
 * @memberof JsExtensions
 * @param {number} max - The upper boundary (excluded).
 * @returns {number} A random integer.
 */
Math.randomInt = function (max) {
  return Math.floor(max * Math.random());
};

/**
 * Returns a number whose value is limited to the given range.
 *
 * @memberof JsExtensions
 * @param {number} min - The lower boundary.
 * @param {number} max - The upper boundary.
 * @returns {number} A number in the range (min, max).
 */
Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max);
};

/**
 * Returns a modulo value which is always positive.
 *
 * @memberof JsExtensions
 * @param {number} n - The divisor.
 * @returns {number} A modulo value.
 */
Number.prototype.mod = function (n) {
  return ((this % n) + n) % n;
};

/**
 * Makes a number string with leading zeros.
 *
 * @memberof JsExtensions
 * @param {number} length - The length of the output string.
 * @returns {string} A string with leading zeros.
 */
Number.prototype.padZero = function (length) {
  return String(this).padZero(length);
};

/**
 * Copy the values of all of the enumerable own properties recursively from one or more source objects to a target object.
 * It also works for nested objects.
 *
 * @memberof JsExtensions
 * @param {object} target - The target object to copy to.
 * @param {object} source - The source object from which to copy properties.
 * @returns {object} The target object.
 */
Object.defineProperty(Object.prototype, 'deepAssign', {
  value: function (target, source) {
    for (let key in source) {
      if (!source.hasOwnProperty(key)) continue;
      if (typeof source[key] === 'object' && source[key] !== null) {
        // If target property already exists, merge recursively.
        if (target[key]) {
          Object.deepAssign(target[key], source[key]);
        } else {
          // Otherwise, directly assign (or create a new object/array appropriately)
          target[key] = Array.isArray(source[key]) ? [] : {};
          Object.deepAssign(target[key], source[key]);
        }
      } else {
        target[key] = source[key];
      }
    }
    return target;
  },
  writable: false,
  configurable: true,
  enumerable: false
});

/**
 * Checks whether the string contains a given string.
 *
 * @memberof JsExtensions
 * @param {string} string - The string to search for.
 * @returns {boolean} True if the string contains a given string.
 * @deprecated includes() should be used instead.
 */
String.prototype.contains = function (string) {
  return this.includes(string);
};

/**
 * Replaces %1, %2 and so on in the string to the arguments.
 *
 * @memberof JsExtensions
 * @param {any} ...args The objects to format.
 * @returns {string} A formatted string.
 */
String.prototype.format = function () {
  return this.replace(/%([0-9]+)/g, (s, n) => arguments[Number(n) - 1]);
};

/**
 * Makes a number string with leading zeros.
 *
 * @memberof JsExtensions
 * @param {number} length - The length of the output string.
 * @returns {string} A string with leading zeros.
 */
String.prototype.padZero = function (length) {
  return this.padStart(length, "0");
};

interface Array<T> {
  /**
   * Makes a shallow copy of the array.
   *
   * @returns {Array} A shallow copy of the array.
   */
  clone(): Array<T>;
  /**
   * Checks whether the array contains a given element.
   *
   * @param {any} element - The element to search for.
   * @returns {boolean} True if the array contains a given element.
   * @deprecated includes() should be used instead.
   */
  contains(element: any): boolean;
  /**
   * Checks whether the two arrays are the same.
   *
   * @param {Array} array - The array to compare to.
   * @returns {boolean} True if the two arrays are the same.
   */
  equals(array: Array<any>): boolean;
  /**
   * Removes a given element from the array (in place).
   *
   * @param {any} element - The element to remove.
   * @returns {Array} The array after remove.
   */
  remove(element: any): Array<T>;
}

interface Math {
  /**
   * Generates a random integer in the range (0, max-1).
   *
   * @memberof JsExtensions
   * @param {number} max - The upper boundary (excluded).
   * @returns {number} A random integer.
   */
  randomInt(max: number): number;
}

interface Number {
  /**
   * Returns a modulo value which is always positive.
   *
   * @memberof JsExtensions
   * @param {number} n - The divisor.
   * @returns {number} A modulo value.
   */
  mod(n: number): number;
  /**
   * Returns a number whose value is limited to the given range.
   *
   * @memberof JsExtensions
   * @param {number} min - The lower boundary.
   * @param {number} max - The upper boundary.
   * @returns {number} A number in the range (min, max).
   */
  clamp(min: number, max: number): number;
  /**
   * Makes a number string with leading zeros.
   *
   * @memberof JsExtensions
   * @param {number} length - The length of the output string.
   * @returns {string} A string with leading zeros.
   */
  padZero(length: number): string;
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
  contains(string: string): boolean;
  /**
   * Replaces %1, %2 and so on in the string to the arguments.
   *
   * @memberof JsExtensions
   * @param {any} ...args The objects to format.
   * @returns {string} A formatted string.
   */
  format(...args: any[]): string
  /**
   * Makes a number string with leading zeros.
   *
   * @memberof JsExtensions
   * @param {number} length - The length of the output string.
   * @returns {string} A string with leading zeros.
   */
  padZero(length: number): string;
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
  deepAssign(target: object, source: object): object;
}
