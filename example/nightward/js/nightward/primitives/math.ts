export const randomRange = (min: number, max: number): number => min + Math.random() * (max - min)
export const pick = <T>(values: readonly T[]): T => values[Math.floor(Math.random() * values.length)]!
