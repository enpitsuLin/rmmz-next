import type { Point } from './geometry'

export class SpatialGrid<T extends Point> {
  private cells = new Map<string, T[]>()
  constructor(private size = 3) {}
  rebuild(items: readonly T[]): void {
    this.cells.clear()
    for (const item of items) {
      const key = `${Math.floor(item.x / this.size)},${Math.floor(item.z / this.size)}`
      const cell = this.cells.get(key)
      if (cell)
        cell.push(item)
      else this.cells.set(key, [item])
    }
  }

  query(x: number, z: number, radius: number): T[] {
    const result: T[] = []
    for (let cx = Math.floor((x - radius) / this.size); cx <= Math.floor((x + radius) / this.size); cx++) {
      for (let cz = Math.floor((z - radius) / this.size); cz <= Math.floor((z + radius) / this.size); cz++) {
        const cell = this.cells.get(`${cx},${cz}`)
        if (cell)
          result.push(...cell)
      }
    }
    return result
  }
}
