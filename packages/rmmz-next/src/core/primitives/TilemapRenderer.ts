import * as PIXI from 'pixi.js'

export class TilemapAtlas {
  readonly textures = Array.from({ length: 3 }, () => new PIXI.TextureSource({
    width: 2048,
    height: 2048,
    scaleMode: 'nearest',
    autoGarbageCollect: false,
  }))

  constructor(readonly images: (HTMLImageElement | HTMLCanvasElement)[]) {}

  destroy(): void {
    for (const texture of this.textures)
      texture.destroy()
  }
}

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
  _clearBuffer: Uint8Array = new Uint8Array(1024 * 1024 * 4)
  private uploadedAtlases = new WeakSet<TilemapAtlas>()
  private boundAtlas: TilemapAtlas | null = null

  constructor() {
    this._shader = this._createShader()
  }

  destroy(): void {
    this._shader?.destroy()
    this._shader = null
    this.boundAtlas = null
  }

  getShader(): PIXI.Shader {
    return this._shader!
  }

  contextChange(): void {
    this.uploadedAtlases = new WeakSet()
    this.boundAtlas = null
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
        uSampler0: PIXI.Texture.EMPTY.source,
        uSampler1: PIXI.Texture.EMPTY.source,
        uSampler2: PIXI.Texture.EMPTY.source,
        tilemapUniforms: new PIXI.UniformGroup({
          uProjectionMatrix: { value: new PIXI.Matrix(), type: 'mat3x3<f32>' },
        }),
      },
    })
  }

  private updateTextures(renderer: PIXI.WebGLRenderer, { images, textures }: TilemapAtlas): void {
    const gl = renderer.gl
    const premultiplyAlpha = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL)
    for (let i = 0; i < images.length; i++) {
      const internalTexture = textures[i >> 2]
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

  bindTextures(renderer: PIXI.WebGLRenderer, atlas: TilemapAtlas): void {
    if (!this.uploadedAtlases.has(atlas)) {
      this.updateTextures(renderer, atlas)
      this.uploadedAtlases.add(atlas)
    }
    if (this.boundAtlas !== atlas) {
      const { resources } = this.getShader()
      resources.uSampler0 = atlas.textures[0]
      resources.uSampler1 = atlas.textures[1]
      resources.uSampler2 = atlas.textures[2]
      this.boundAtlas = atlas
    }
  }
}
