export type RGBA = [r: number, g: number, b: number, a: number];

export const enum EasingType {
  easeIn = 1,
  easeOut = 2,
  easeInOut = 3
}

export type EffectType = 'whiten' | 'blink' | 'collapse' | 'bosscollapse' | 'instantcollapse'

export type MotionType = 'guard' | 'spell' | 'skill' | 'item' | 'thrust' | 'swing' | 'missile' | 'damage' | 'evade' | 'victory' | 'escape'
