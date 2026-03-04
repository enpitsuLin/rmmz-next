import * as PIXI from 'pixi.js'
import { Bitmap } from './Bitmap'
import { Graphics } from './Graphics'
import { Point } from './Point'
import { TilemapLayer } from './TilemapLayer'


/**
 * The tilemap which displays 2D tile-based game map.
 *
 * @class
 * @extends PIXI.Container
 */
export class Tilemap extends PIXI.Container {
  protected _width: number
  protected _height: number
  protected _margin: number
  protected _mapWidth: number
  protected _mapHeight: number
  protected _mapData: number[] | null
  protected _bitmaps: Bitmap[]
  protected _lowerLayer!: Tilemap.CombinedLayer
  protected _upperLayer!: Tilemap.CombinedLayer
  protected _needsRepaint!: boolean
  protected _needsBitmapsUpdate: boolean = false
  protected _lastAnimationFrame?: number
  protected _lastStartX?: number
  protected _lastStartY?: number

  /**
   * The width of each tile.
   *
   * @type number
   */
  tileWidth: number
  /**
   * The height of each tile.
   *
   * @type number
   */
  tileHeight: number
  /**
   * The origin point of the tilemap for scrolling.
   *
   * @type Point
   */
  origin: Point
  /**
   * The tileset flags.
   *
   * @type array
   */
  flags: number[]
  /**
   * The animation count for autotiles.
   *
   * @type number
   */
  animationCount: number
  animationFrame: number
  /**
   * Whether the tilemap loops horizontal.
   *
   * @type boolean
   */
  horizontalWrap: boolean
  /**
   * Whether the tilemap loops vertical.
   *
   * @type boolean
   */
  verticalWrap: boolean

  constructor() {
    super();
    this._width = Graphics.width;
    this._height = Graphics.height;
    this._margin = 20;
    this._mapWidth = 0;
    this._mapHeight = 0;
    this._mapData = null;
    this._bitmaps = [];

    this.tileWidth = 48;
    this.tileHeight = 48;
    this.origin = new Point();
    this.flags = [];
    this.animationCount = 0;
    this.horizontalWrap = false;
    this.verticalWrap = false;
    this.animationFrame = 0;
    this._createLayers();
    this.refresh();
  }

  /**
   * The width of the tilemap.
   *
   * @type number
   * @name Tilemap#width
   */
  get width() {
    return this._width;
  }

  set width(value) {
    this._width = value;
  }

  /**
   * The height of the tilemap.
   *
   * @type number
   * @name Tilemap#height
   */
  get height() {
    return this._height;
  }

  set height(value) {
    this._height = value;
  }

  /**
   * Destroys the tilemap.
   */
  destroy(options: Tilemap.DestroyOptions = { children: true, texture: true }) {
    super.destroy(options);
  }

  /**
   * Sets the tilemap data.
   *
   * @param {number} width - The width of the map in number of tiles.
   * @param {number} height - The height of the map in number of tiles.
   * @param {array} data - The one dimensional array for the map data.
   */
  setData(width: number, height: number, data: number[]): void {
    this._mapWidth = width;
    this._mapHeight = height;
    this._mapData = data;
  }

  /**
   * Checks whether the tileset is ready to render.
   *
   * @type boolean
   * @returns {boolean} True if the tilemap is ready.
   */
  isReady(): boolean {
    for (const bitmap of this._bitmaps) {
      if (bitmap && !bitmap.isReady()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Updates the tilemap for each frame.
   */
  //@ts-expect-error DisplayObject from "@pixi/display" use Omit cause ts(2425), ignore that
  update(): void {
    this.animationCount++;
    this.animationFrame = Math.floor(this.animationCount / 30);
    for (const child of this.children) {
      if (child.update) {
        child.update();
      }
    }
  }

  /**
   * Sets the bitmaps used as a tileset.
   *
   * @param {array} bitmaps - The array of the tileset bitmaps.
   */
  setBitmaps(bitmaps: Bitmap[]): void {
    // [Note] We wait for the images to finish loading. Creating textures
    //   from bitmaps that are not yet loaded here brings some maintenance
    //   difficulties. e.g. PIXI overwrites img.onload internally.
    this._bitmaps = bitmaps;
    const listener = this._updateBitmaps.bind(this);
    for (const bitmap of this._bitmaps) {
      if (!bitmap.isReady()) {
        bitmap.addLoadListener(listener);
      }
    }
    this._needsBitmapsUpdate = true;
    this._updateBitmaps();
  }

  /**
   * Forces to repaint the entire tilemap.
   */
  refresh(): void {
    this._needsRepaint = true;
  }

  /**
   * Updates the transform on all children of this container for rendering.
   */
  updateTransform(): void {
    const ox = Math.ceil(this.origin.x);
    const oy = Math.ceil(this.origin.y);
    const startX = Math.floor((ox - this._margin) / this.tileWidth);
    const startY = Math.floor((oy - this._margin) / this.tileHeight);
    this._lowerLayer.x = startX * this.tileWidth - ox;
    this._lowerLayer.y = startY * this.tileHeight - oy;
    this._upperLayer.x = startX * this.tileWidth - ox;
    this._upperLayer.y = startY * this.tileHeight - oy;
    if (
      this._needsRepaint ||
      this._lastAnimationFrame !== this.animationFrame ||
      this._lastStartX !== startX ||
      this._lastStartY !== startY
    ) {
      this._lastAnimationFrame = this.animationFrame;
      this._lastStartX = startX;
      this._lastStartY = startY;
      this._addAllSpots(startX, startY);
      this._needsRepaint = false;
    }
    this._sortChildren();
    super.updateTransform();
  }

  protected _createLayers(): void {
    this._lowerLayer = new Tilemap.CombinedLayer();
    this._lowerLayer.z = 0;
    this._upperLayer = new Tilemap.CombinedLayer();
    this._upperLayer.z = 4;
    this.addChild(this._lowerLayer);
    this.addChild(this._upperLayer);
    this._needsRepaint = true;
  }

  protected _updateBitmaps(): void {
    if (this._needsBitmapsUpdate && this.isReady()) {
      this._lowerLayer.setBitmaps(this._bitmaps);
      this._needsBitmapsUpdate = false;
      this._needsRepaint = true;
    }
  }

  protected _addAllSpots(startX: number, startY: number): void {
    this._lowerLayer.clear();
    this._upperLayer.clear();
    const widthWithMatgin = this.width + this._margin * 2;
    const heightWithMatgin = this.height + this._margin * 2;
    const tileCols = Math.ceil(widthWithMatgin / this.tileWidth) + 1;
    const tileRows = Math.ceil(heightWithMatgin / this.tileHeight) + 1;
    for (let y = 0; y < tileRows; y++) {
      for (let x = 0; x < tileCols; x++) {
        this._addSpot(startX, startY, x, y);
      }
    }
  }

  protected _addSpot(startX: number, startY: number, x: number, y: number): void {
    const mx = startX + x;
    const my = startY + y;
    const dx = x * this.tileWidth;
    const dy = y * this.tileHeight;
    const tileId0 = this._readMapData(mx, my, 0);
    const tileId1 = this._readMapData(mx, my, 1);
    const tileId2 = this._readMapData(mx, my, 2);
    const tileId3 = this._readMapData(mx, my, 3);
    const shadowBits = this._readMapData(mx, my, 4);
    const upperTileId1 = this._readMapData(mx, my - 1, 1);
    this._addSpotTile(tileId0, dx, dy);
    this._addSpotTile(tileId1, dx, dy);
    this._addShadow(this._lowerLayer, shadowBits, dx, dy);
    if (this._isTableTile(upperTileId1) && !this._isTableTile(tileId1)) {
      if (!Tilemap.isShadowingTile(tileId0)) {
        this._addTableEdge(this._lowerLayer, upperTileId1, dx, dy);
      }
    }
    if (this._isOverpassPosition(mx, my)) {
      this._addTile(this._upperLayer, tileId2, dx, dy);
      this._addTile(this._upperLayer, tileId3, dx, dy);
    } else {
      this._addSpotTile(tileId2, dx, dy);
      this._addSpotTile(tileId3, dx, dy);
    }
  }

  protected _addSpotTile(tileId: number, dx: number, dy: number): void {
    if (this._isHigherTile(tileId)) {
      this._addTile(this._upperLayer, tileId, dx, dy);
    } else {
      this._addTile(this._lowerLayer, tileId, dx, dy);
    }
  }

  protected _addTile(layer: Tilemap.CombinedLayer, tileId: number, dx: number, dy: number): void {
    if (Tilemap.isVisibleTile(tileId)) {
      if (Tilemap.isAutotile(tileId)) {
        this._addAutotile(layer, tileId, dx, dy);
      } else {
        this._addNormalTile(layer, tileId, dx, dy);
      }
    }
  }

  protected _addNormalTile(layer: Tilemap.CombinedLayer, tileId: number, dx: number, dy: number): void {
    let setNumber = 0;
    if (Tilemap.isTileA5(tileId)) {
      setNumber = 4;
    } else {
      setNumber = 5 + Math.floor(tileId / 256);
    }
    const w = this.tileWidth;
    const h = this.tileHeight;
    const sx = ((Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)) * w;
    const sy = (Math.floor((tileId % 256) / 8) % 16) * h;
    layer.addRect(setNumber, sx, sy, dx, dy, w, h);
  }

  protected _addAutotile(layer: Tilemap.CombinedLayer, tileId: number, dx: number, dy: number): void {
    const kind = Tilemap.getAutotileKind(tileId);
    const shape = Tilemap.getAutotileShape(tileId);
    const tx = kind % 8;
    const ty = Math.floor(kind / 8);
    let setNumber = 0;
    let bx = 0;
    let by = 0;
    let autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
    let isTable = false;
    if (Tilemap.isTileA1(tileId)) {
      const waterSurfaceIndex = [0, 1, 2, 1][this.animationFrame % 4];
      setNumber = 0;
      if (kind === 0) {
        bx = waterSurfaceIndex * 2;
        by = 0;
      } else if (kind === 1) {
        bx = waterSurfaceIndex * 2;
        by = 3;
      } else if (kind === 2) {
        bx = 6;
        by = 0;
      } else if (kind === 3) {
        bx = 6;
        by = 3;
      } else {
        bx = Math.floor(tx / 4) * 8;
        by = ty * 6 + (Math.floor(tx / 2) % 2) * 3;
        if (kind % 2 === 0) {
          bx += waterSurfaceIndex * 2;
        } else {
          bx += 6;
          autotileTable = Tilemap.WATERFALL_AUTOTILE_TABLE;
          by += this.animationFrame % 3;
        }
      }
    } else if (Tilemap.isTileA2(tileId)) {
      setNumber = 1;
      bx = tx * 2;
      by = (ty - 2) * 3;
      isTable = this._isTableTile(tileId);
    } else if (Tilemap.isTileA3(tileId)) {
      setNumber = 2;
      bx = tx * 2;
      by = (ty - 6) * 2;
      autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
    } else if (Tilemap.isTileA4(tileId)) {
      setNumber = 3;
      bx = tx * 2;
      by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0));
      if (ty % 2 === 1) {
        autotileTable = Tilemap.WALL_AUTOTILE_TABLE;
      }
    }
    const table = autotileTable[shape];
    const w1 = this.tileWidth / 2;
    const h1 = this.tileHeight / 2;
    for (let i = 0; i < 4; i++) {
      const qsx = table[i][0];
      const qsy = table[i][1];
      const sx1 = (bx * 2 + qsx) * w1;
      const sy1 = (by * 2 + qsy) * h1;
      const dx1 = dx + (i % 2) * w1;
      const dy1 = dy + Math.floor(i / 2) * h1;
      if (isTable && (qsy === 1 || qsy === 5)) {
        const qsx2 = qsy === 1 ? (4 - qsx) % 4 : qsx;
        const qsy2 = 3;
        const sx2 = (bx * 2 + qsx2) * w1;
        const sy2 = (by * 2 + qsy2) * h1;
        layer.addRect(setNumber, sx2, sy2, dx1, dy1, w1, h1);
        layer.addRect(setNumber, sx1, sy1, dx1, dy1 + h1 / 2, w1, h1 / 2);
      } else {
        layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, h1);
      }
    }
  }

  protected _addTableEdge(layer: Tilemap.CombinedLayer, tileId: number, dx: number, dy: number): void {
    if (Tilemap.isTileA2(tileId)) {
      const autotileTable = Tilemap.FLOOR_AUTOTILE_TABLE;
      const kind = Tilemap.getAutotileKind(tileId);
      const shape = Tilemap.getAutotileShape(tileId);
      const tx = kind % 8;
      const ty = Math.floor(kind / 8);
      const setNumber = 1;
      const bx = tx * 2;
      const by = (ty - 2) * 3;
      const table = autotileTable[shape];
      const w1 = this.tileWidth / 2;
      const h1 = this.tileHeight / 2;
      for (let i = 0; i < 2; i++) {
        const qsx = table[2 + i][0];
        const qsy = table[2 + i][1];
        const sx1 = (bx * 2 + qsx) * w1;
        const sy1 = (by * 2 + qsy) * h1 + h1 / 2;
        const dx1 = dx + (i % 2) * w1;
        const dy1 = dy + Math.floor(i / 2) * h1;
        layer.addRect(setNumber, sx1, sy1, dx1, dy1, w1, h1 / 2);
      }
    }
  }

  protected _addShadow(layer: Tilemap.CombinedLayer, shadowBits: number, dx: number, dy: number): void {
    if (shadowBits & 0x0f) {
      const w1 = this.tileWidth / 2;
      const h1 = this.tileHeight / 2;
      for (let i = 0; i < 4; i++) {
        if (shadowBits & (1 << i)) {
          const dx1 = dx + (i % 2) * w1;
          const dy1 = dy + Math.floor(i / 2) * h1;
          layer.addRect(-1, 0, 0, dx1, dy1, w1, h1);
        }
      }
    }
  }

  protected _readMapData(x: number, y: number, z: number): number {
    if (this._mapData) {
      const width = this._mapWidth;
      const height = this._mapHeight;
      if (this.horizontalWrap) {
        x = x.mod(width);
      }
      if (this.verticalWrap) {
        y = y.mod(height);
      }
      if (x >= 0 && x < width && y >= 0 && y < height) {
        return this._mapData[(z * height + y) * width + x] || 0;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  }

  protected _isHigherTile(tileId: number): boolean {
    return !!(this.flags[tileId] & 0x10);
  }

  protected _isTableTile(tileId: number): boolean {
    return !!(Tilemap.isTileA2(tileId) && this.flags[tileId] & 0x80);
  }

  protected _isOverpassPosition(_mx?: number, _my?: number): boolean {
    return false;
  }

  protected _sortChildren(): void {
    this.children.sort(this._compareChildOrder.bind(this));
  }

  protected _compareChildOrder(a: { z?: number; y?: number; spriteId?: number }, b: { z?: number; y?: number; spriteId?: number }): number {
    const aZ = a.z ?? 0;
    const bZ = b.z ?? 0;
    if (aZ !== bZ) {
      return aZ - bZ;
    }
    const aY = a.y ?? 0;
    const bY = b.y ?? 0;
    if (aY !== bY) {
      return aY - bY;
    }
    return (a.spriteId ?? 0) - (b.spriteId ?? 0);
  }

  //::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  // Tile type checkers
  static TILE_ID_B = 0;
  static TILE_ID_C = 256;
  static TILE_ID_D = 512;
  static TILE_ID_E = 768;
  static TILE_ID_A5 = 1536;
  static TILE_ID_A1 = 2048;
  static TILE_ID_A2 = 2816;
  static TILE_ID_A3 = 4352;
  static TILE_ID_A4 = 5888;
  static TILE_ID_MAX = 8192;
  static isVisibleTile(tileId: number): boolean {
    return tileId > 0 && tileId < this.TILE_ID_MAX;
  }
  static isAutotile(tileId: number): boolean {
    return tileId >= this.TILE_ID_A1;
  }
  static getAutotileKind(tileId: number): number {
    return Math.floor((tileId - this.TILE_ID_A1) / 48);
  }
  static getAutotileShape(tileId: number): number {
    return (tileId - this.TILE_ID_A1) % 48;
  }
  static makeAutotileId(kind: number, shape: number): number {
    return this.TILE_ID_A1 + kind * 48 + shape;
  }
  static isSameKindTile(tileID1: number, tileID2: number): boolean {
    if (this.isAutotile(tileID1) && this.isAutotile(tileID2)) {
      return this.getAutotileKind(tileID1) === this.getAutotileKind(tileID2);
    } else {
      return tileID1 === tileID2;
    }
  }
  static isTileA1(tileId: number): boolean {
    return tileId >= this.TILE_ID_A1 && tileId < this.TILE_ID_A2;
  }
  static isTileA2(tileId: number): boolean {
    return tileId >= this.TILE_ID_A2 && tileId < this.TILE_ID_A3;
  }
  static isTileA3(tileId: number): boolean {
    return tileId >= this.TILE_ID_A3 && tileId < this.TILE_ID_A4;
  }
  static isTileA4(tileId: number): boolean {
    return tileId >= this.TILE_ID_A4 && tileId < this.TILE_ID_MAX;
  }
  static isTileA5(tileId: number): boolean {
    return tileId >= this.TILE_ID_A5 && tileId < this.TILE_ID_A1;
  }
  static isWaterTile(tileId: number): boolean {
    if (this.isTileA1(tileId)) {
      return !(tileId >= this.TILE_ID_A1 + 96 && tileId < this.TILE_ID_A1 + 192);
    } else {
      return false;
    }
  }

  static isWaterfallTile(tileId: number): boolean {
    if (tileId >= this.TILE_ID_A1 + 192 && tileId < this.TILE_ID_A2) {
      return this.getAutotileKind(tileId) % 2 === 1;
    } else {
      return false;
    }
  }

  static isGroundTile(tileId: number): boolean {
    return (
      this.isTileA1(tileId) || this.isTileA2(tileId) || this.isTileA5(tileId)
    );
  }

  static isShadowingTile(tileId: number): boolean {
    return this.isTileA3(tileId) || this.isTileA4(tileId);
  }

  static isRoofTile(tileId: number): boolean {
    return this.isTileA3(tileId) && this.getAutotileKind(tileId) % 16 < 8;
  }

  static isWallTopTile(tileId: number): boolean {
    return this.isTileA4(tileId) && this.getAutotileKind(tileId) % 16 < 8;
  }

  static isWallSideTile(tileId: number): boolean {
    return (
      (this.isTileA3(tileId) || this.isTileA4(tileId)) &&
      this.getAutotileKind(tileId) % 16 >= 8
    );
  }

  static isWallTile(tileId: number): boolean {
    return this.isWallTopTile(tileId) || this.isWallSideTile(tileId);
  }

  static isFloorTypeAutotile(tileId: number): boolean {
    return (
      (this.isTileA1(tileId) && !this.isWaterfallTile(tileId)) ||
      this.isTileA2(tileId) ||
      this.isWallTopTile(tileId)
    );
  }

  static isWallTypeAutotile(tileId: number): boolean {
    return this.isRoofTile(tileId) || this.isWallSideTile(tileId);
  }

  static isWaterfallTypeAutotile(tileId: number): boolean {
    return this.isWaterfallTile(tileId);
  }

  //::::::::::::::::::::::::::::::::::::::::::::::::::::::::
  // Autotile shape number to coordinates of tileset images
  static FLOOR_AUTOTILE_TABLE: Tilemap.AutotileTableShape[] = [
    [[2, 4], [1, 4], [2, 3], [1, 3]],
    [[2, 0], [1, 4], [2, 3], [1, 3]],
    [[2, 4], [3, 0], [2, 3], [1, 3]],
    [[2, 0], [3, 0], [2, 3], [1, 3]],
    [[2, 4], [1, 4], [2, 3], [3, 1]],
    [[2, 0], [1, 4], [2, 3], [3, 1]],
    [[2, 4], [3, 0], [2, 3], [3, 1]],
    [[2, 0], [3, 0], [2, 3], [3, 1]],
    [[2, 4], [1, 4], [2, 1], [1, 3]],
    [[2, 0], [1, 4], [2, 1], [1, 3]],
    [[2, 4], [3, 0], [2, 1], [1, 3]],
    [[2, 0], [3, 0], [2, 1], [1, 3]],
    [[2, 4], [1, 4], [2, 1], [3, 1]],
    [[2, 0], [1, 4], [2, 1], [3, 1]],
    [[2, 4], [3, 0], [2, 1], [3, 1]],
    [[2, 0], [3, 0], [2, 1], [3, 1]],
    [[0, 4], [1, 4], [0, 3], [1, 3]],
    [[0, 4], [3, 0], [0, 3], [1, 3]],
    [[0, 4], [1, 4], [0, 3], [3, 1]],
    [[0, 4], [3, 0], [0, 3], [3, 1]],
    [[2, 2], [1, 2], [2, 3], [1, 3]],
    [[2, 2], [1, 2], [2, 3], [3, 1]],
    [[2, 2], [1, 2], [2, 1], [1, 3]],
    [[2, 2], [1, 2], [2, 1], [3, 1]],
    [[2, 4], [3, 4], [2, 3], [3, 3]],
    [[2, 4], [3, 4], [2, 1], [3, 3]],
    [[2, 0], [3, 4], [2, 3], [3, 3]],
    [[2, 0], [3, 4], [2, 1], [3, 3]],
    [[2, 4], [1, 4], [2, 5], [1, 5]],
    [[2, 0], [1, 4], [2, 5], [1, 5]],
    [[2, 4], [3, 0], [2, 5], [1, 5]],
    [[2, 0], [3, 0], [2, 5], [1, 5]],
    [[0, 4], [3, 4], [0, 3], [3, 3]],
    [[2, 2], [1, 2], [2, 5], [1, 5]],
    [[0, 2], [1, 2], [0, 3], [1, 3]],
    [[0, 2], [1, 2], [0, 3], [3, 1]],
    [[2, 2], [3, 2], [2, 3], [3, 3]],
    [[2, 2], [3, 2], [2, 1], [3, 3]],
    [[2, 4], [3, 4], [2, 5], [3, 5]],
    [[2, 0], [3, 4], [2, 5], [3, 5]],
    [[0, 4], [1, 4], [0, 5], [1, 5]],
    [[0, 4], [3, 0], [0, 5], [1, 5]],
    [[0, 2], [3, 2], [0, 3], [3, 3]],
    [[0, 2], [1, 2], [0, 5], [1, 5]],
    [[0, 4], [3, 4], [0, 5], [3, 5]],
    [[2, 2], [3, 2], [2, 5], [3, 5]],
    [[0, 2], [3, 2], [0, 5], [3, 5]],
    [[0, 0], [1, 0], [0, 1], [1, 1]]
  ];
  // prettier-ignore
  static WALL_AUTOTILE_TABLE: Tilemap.AutotileTableShape[] = [
    [[2, 2], [1, 2], [2, 1], [1, 1]],
    [[0, 2], [1, 2], [0, 1], [1, 1]],
    [[2, 0], [1, 0], [2, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[2, 2], [3, 2], [2, 1], [3, 1]],
    [[0, 2], [3, 2], [0, 1], [3, 1]],
    [[2, 0], [3, 0], [2, 1], [3, 1]],
    [[0, 0], [3, 0], [0, 1], [3, 1]],
    [[2, 2], [1, 2], [2, 3], [1, 3]],
    [[0, 2], [1, 2], [0, 3], [1, 3]],
    [[2, 0], [1, 0], [2, 3], [1, 3]],
    [[0, 0], [1, 0], [0, 3], [1, 3]],
    [[2, 2], [3, 2], [2, 3], [3, 3]],
    [[0, 2], [3, 2], [0, 3], [3, 3]],
    [[2, 0], [3, 0], [2, 3], [3, 3]],
    [[0, 0], [3, 0], [0, 3], [3, 3]]
  ];
  // prettier-ignore
  static WATERFALL_AUTOTILE_TABLE: Tilemap.AutotileTableShape[] = [
    [[2, 0], [1, 0], [2, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[2, 0], [3, 0], [2, 1], [3, 1]],
    [[0, 0], [3, 0], [0, 1], [3, 1]]
  ];
}

export namespace Tilemap {
  export type AutotileTableShape = readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number]
  ]
  export interface DestroyOptions {
    children?: boolean
    texture?: boolean
  }


  /**
   * Internal class for the tilemap combined layer.
   *
   * @class
   * @extends PIXI.Container
   */
  export class CombinedLayer extends PIXI.Container<TilemapLayer> {
    /**
     * Z-order for child sorting (used by Tilemap)
     *
     * - 0 : Lower tiles
     * - 1 : Lower characters
     * - 3 : Normal characters
     * - 4 : Upper tiles
     * - 5 : Upper characters
     * - 6 : Airship shadow
     * - 7 : Balloon
     * - 8 : Animation
     * - 9 : Destination
     */
    z?: number;

    constructor() {
      super();
      for (let i = 0; i < 2; i++) {
        this.addChild(new TilemapLayer());
      }
    }

    destroy(options = { children: true, texture: true }) {
      super.destroy(options);
    }

    setBitmaps(bitmaps: Bitmap[]): void {
      for (const child of this.children) {
        child.setBitmaps(bitmaps);
      }
    }

    clear(): void {
      for (const child of this.children) {
        child.clear();
      }
    }

    size(): number {
      return this.children.reduce((r, child) => r + child.size(), 0);
    }

    // prettier-ignore
    addRect(setNumber: number, sx: number, sy: number, dx: number, dy: number, w: number, h: number): void {
      for (const child of this.children) {
        if (child.size() < TilemapLayer.MAX_SIZE) {
          child.addRect(setNumber, sx, sy, dx, dy, w, h);
          break;
        }
      }
    }

    isReady(): boolean {
      return this.children.every((child) => child.isReady());
    }
  }
}
