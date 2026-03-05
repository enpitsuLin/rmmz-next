declare namespace GlobalMixins {
  interface RMMZDisplayObject {
    update: () => void
  }

  interface DisplayObject extends RMMZDisplayObject {

  }

  interface IRendererPlugins {
    rpgtilemap: import('.').TilemapRenderer
  }

  interface Sprite {
    ax?: number
    ay?: number
  }
}
