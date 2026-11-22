export declare const edgeMasks: number[]
export declare function connectedCorners(mask: number): number
export declare function isDirtTile(tile: number): boolean
export declare function groundTileId(name: 'grass' | 'dirt', x: number, y: number): number
export declare function dirtEdgeAlpha(mask: number, x: number, y: number): number
export declare function refreshDirtEdges(map: { width: number, height: number, data: number[] }, center: number): void
