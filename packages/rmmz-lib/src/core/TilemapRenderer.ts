import * as PIXI from 'pixi.js'
import { TilemapLayer } from './TilemapLayer'

/**
 * Internal class for the tilemap renderer.
 *
 * @class
 * @extends PIXI.ObjectRenderer
 */
export class TilemapRenderer extends PIXI.ObjectRenderer {
  private _shader: PIXI.Shader | null = null
  private _images: PIXI.Texture[] = []
  private _internalTextures: PIXI.BaseRenderTexture[] = []
  private _clearBuffer: Uint8Array = new Uint8Array(1024 * 1024 * 4)

  constructor(renderer: PIXI.Renderer) {
    super(renderer)
    this._shader = null
    this._images = []
    this._internalTextures = []
    this._clearBuffer = new Uint8Array(1024 * 1024 * 4)
    this.contextChange()
  }

  destroy() {
    super.destroy()
    this._destroyInternalTextures()
    this._shader?.destroy()
    this._shader = null
  }

  getShader() {
    return this._shader
  }

  contextChange() {
    this._shader = this._createShader()
    this._images = []
    this._createInternalTextures()
  }

  _createShader() {
    const vertexSrc
      = 'attribute float aTextureId;'
        + 'attribute vec4 aFrame;'
        + 'attribute vec2 aSource;'
        + 'attribute vec2 aDest;'
        + 'uniform mat3 uProjectionMatrix;'
        + 'varying vec4 vFrame;'
        + 'varying vec2 vTextureCoord;'
        + 'varying float vTextureId;'
        + 'void main(void) {'
        + '  vec3 position = uProjectionMatrix * vec3(aDest, 1.0);'
        + '  gl_Position = vec4(position, 1.0);'
        + '  vFrame = aFrame;'
        + '  vTextureCoord = aSource;'
        + '  vTextureId = aTextureId;'
        + '}'
    const fragmentSrc
      = 'varying vec4 vFrame;'
        + 'varying vec2 vTextureCoord;'
        + 'varying float vTextureId;'
        + 'uniform sampler2D uSampler0;'
        + 'uniform sampler2D uSampler1;'
        + 'uniform sampler2D uSampler2;'
        + 'void main(void) {'
        + '  vec2 textureCoord = clamp(vTextureCoord, vFrame.xy, vFrame.zw);'
        + '  int textureId = int(vTextureId);'
        + '  vec4 color;'
        + '  if (textureId < 0) {'
        + '    color = vec4(0.0, 0.0, 0.0, 0.5);'
        + '  } else if (textureId == 0) {'
        + '    color = texture2D(uSampler0, textureCoord / 2048.0);'
        + '  } else if (textureId == 1) {'
        + '    color = texture2D(uSampler1, textureCoord / 2048.0);'
        + '  } else if (textureId == 2) {'
        + '    color = texture2D(uSampler2, textureCoord / 2048.0);'
        + '  }'
        + '  gl_FragColor = color;'
      + '}'

    return new PIXI.Shader(PIXI.Program.from(vertexSrc, fragmentSrc), {
      uSampler0: 0,
      uSampler1: 0,
      uSampler2: 0,
      uProjectionMatrix: new PIXI.Matrix(),
    })
  }

  _createInternalTextures() {
    this._destroyInternalTextures()
    for (let i = 0; i < TilemapLayer.MAX_GL_TEXTURES; i++) {
      const baseTexture = new PIXI.BaseRenderTexture()
      baseTexture.resize(2048, 2048)
      baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST
      this._internalTextures.push(baseTexture)
    }
  }

  _destroyInternalTextures() {
    for (const internalTexture of this._internalTextures) {
      internalTexture.destroy()
    }
    this._internalTextures = []
  }

  updateTextures(renderer, images) {
    for (let i = 0; i < images.length; i++) {
      const internalTexture = this._internalTextures[i >> 2]
      renderer.texture.bind(internalTexture, 0)
      const gl = renderer.gl
      const x = 1024 * (i % 2)
      const y = 1024 * ((i >> 1) % 2)
      const format = gl.RGBA
      const type = gl.UNSIGNED_BYTE
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0)
      // prettier-ignore
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, 1024, 1024, format, type, this._clearBuffer)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, format, type, images[i])
    }
  }

  bindTextures(renderer) {
    for (let ti = 0; ti < TilemapLayer.MAX_GL_TEXTURES; ti++) {
      renderer.texture.bind(this._internalTextures[ti], ti)
    }
  }
}
