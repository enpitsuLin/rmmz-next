export type RGBA = [r: number, g: number, b: number, a: number]

export type VehicleType = 'boat' | 'ship' | 'airship' | 'walk' | ''

export type BattlePhase = '' | 'start' | 'input' | 'turn' | 'action' | 'turnEnd' | 'battleEnd' | 'aborting'

export type PickMethodProperties<T> = {
  [M in keyof T as T[M] extends (...args: any[]) => any ? M : never]: T[M]
}
