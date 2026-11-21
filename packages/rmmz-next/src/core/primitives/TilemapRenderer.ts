import * as PIXI from 'pixi.js'
import { TilemapLayer } from './TilemapLayer'

/**
 * Internal class for the tilemap renderer.
 *
 * @class
 * @implements PIXI.System
 */
export class TilemapRenderer implements PIXI.System {
  static extension = {
    type: PIXI.ExtensionType.WebGLSystem,
    name: 'rpgtilemap',
  } as const

  _shader: PIXI.Shader | null = null
  _images: (HTMLImageElement | HTMLCanvasElement)[] = []
  _needsTexturesUpdate = false
  _internalTextures: PIXI.TextureSource[] = []
  _clearBuffer: Uint8Array = new Uint8Array(1024 * 1024 * 4)

  constructor() {
    this._createInternalTextures()
    this._shader = this._createShader()
  }

  destroy(): void {
    this._destroyInternalTextures()
    this._shader?.destroy()
    this._shader = null
  }

  getShader(): PIXI.Shader {
    return this._shader!
  }

  contextChange(): void {
    this._needsTexturesUpdate = true
  }

  _createShader(): PIXI.Shader {
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

    return PIXI.Shader.from({
      gl: { vertex: vertexSrc, fragment: fragmentSrc },
      resources: {
        uSampler0: this._internalTextures[0],
        uSampler1: this._internalTextures[1],
        uSampler2: this._internalTextures[2],
        tilemapUniforms: new PIXI.UniformGroup({
          uProjectionMatrix: { value: new PIXI.Matrix(), type: 'mat3x3<f32>' },
        }),
      },
    })
  }

  _createInternalTextures(): void {
    this._destroyInternalTextures()
    for (let i = 0; i < TilemapLayer.MAX_GL_TEXTURES; i++) {
      const source = new PIXI.TextureSource({
        width: 2048,
        height: 2048,
        scaleMode: 'nearest',
        autoGarbageCollect: false,
      })
      this._internalTextures.push(source)
    }
  }

  _destroyInternalTextures(): void {
    for (const internalTexture of this._internalTextures) {
      internalTexture.destroy()
    }
    this._internalTextures = []
  }

  updateTextures(renderer: PIXI.WebGLRenderer, images: (HTMLImageElement | HTMLCanvasElement)[]): void {
    this._images = images
    this._needsTexturesUpdate = false
    const gl = renderer.gl
    const premultiplyAlpha = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)
    for (let i = 0; i < images.length; i++) {
      const internalTexture = this._internalTextures[i >> 2]
      renderer.texture.bindSource(internalTexture, 0)
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
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplyAlpha)
  }

  bindTextures(renderer: PIXI.WebGLRenderer): void {
    if (this._needsTexturesUpdate) {
      this.updateTextures(renderer, this._images)
    }
  }
}
