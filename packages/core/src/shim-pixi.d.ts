declare namespace GlobalMixins {
  interface RMMZDisplayObject {
    update: () => void
  }

  interface DisplayObject extends RMMZDisplayObject {

  }

  interface IRendererPlugins {
    rpgtilemap: import('./core').TilemapRenderer
  }

  interface Sprite {
    ax?: number
    ay?: number
  }
}
