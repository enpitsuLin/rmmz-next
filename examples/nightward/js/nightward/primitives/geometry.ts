import type { Matrix4 } from '@pixi/3d'

export interface Point { x: number, z: number }

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.z - b.z)
export function direction(x: number, z: number): Point {
  const length = Math.hypot(x, z)
  return length ? { x: x / length, z: z / length } : { x: 0, z: 0 }
}

export function transformPoint(matrix: Matrix4, x: number, y: number, z: number): {
  x: number
  y: number
  z: number
} {
  const m = matrix.elements
  return { x: m[0]! * x + m[4]! * y + m[8]! * z + m[12]!, y: m[1]! * x + m[5]! * y + m[9]! * z + m[13]!, z: m[2]! * x + m[6]! * y + m[10]! * z + m[14]! }
}
