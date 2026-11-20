/**
 * ClassRegistry
 *
 * Stores game object constructors by name so save data can be restored without
 * eval(). Kept separate from GlobalMananger so the registry is a leaf module:
 * primitives and managers can use it without pulling in the global state.
 */
export class ClassRegistry {
  constructor() {
    throw new Error('This is a static class')
  }

  static _registry = new Map<string, ClassRegistry.Constructor>()

  /**
   * Register a class constructor for ESM-compatible serialization/deserialization.
   */
  static register(constructor: ClassRegistry.Constructor): void {
    if (!constructor.name) {
      throw new TypeError('Constructor has no properly name')
    }
    this._registry.set(constructor.name, constructor)
  }

  /**
   * Retrieve a registered class constructor by name.
   */
  static get<T extends ClassRegistry.Constructor>(name: string): T | undefined {
    return this._registry.get(name) as T | undefined
  }
}

export namespace ClassRegistry {
  export type AnyConstructor = abstract new (...args: any[]) => any
  export type Constructor = new (...args: any[]) => any
}
