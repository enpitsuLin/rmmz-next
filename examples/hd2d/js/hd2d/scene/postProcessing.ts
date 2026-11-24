import type { View3D } from '@pixi/3d'
import { PostEffect } from '@pixi/3d'
import { BloomEffect } from '@pixi/3d/extras'
import { UniformGroup } from 'pixi.js'

export const TONE_MAPPING_MODES = {
  ACES: 'aces',
  REINHARD: 'reinhard',
  REINHARD2: 'reinhard2',
  UNCHARTED2: 'uncharted2',
  LINEAR: 'none',
} as const

export type ToneMappingMode = (typeof TONE_MAPPING_MODES)[keyof typeof TONE_MAPPING_MODES]

class GradeEffect extends PostEffect {
  protected readonly uniforms = new UniformGroup({
    uGrade: { value: new Float32Array(3), type: 'vec3<f32>' },
    uVignette: { value: new Float32Array(2), type: 'vec2<f32>' },
    uReinhard: { value: -1, type: 'f32' },
  })

  protected readonly fragment = {
    gl: `vec4 effect(vec2 uv) {
  vec4 color = sampleColor(uv);
  float average = dot(color.rgb, vec3(1.0 / 3.0));
  vec3 rgb = mix(color.rgb, vec3(average), uGrade.x);
  rgb = (rgb - 0.5 + uGrade.y) * uGrade.z + 0.5;
  float edge = length(uv - 0.5) * (uVignette.x + uVignette.y);
  rgb = max(rgb * (1.0 - smoothstep(uVignette.y * 0.799, 0.8, edge)), vec3(0.0));
  if (uReinhard >= 0.0) {
    rgb *= uReinhard;
    float luminance = 10.0 * dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    rgb *= luminance * (1.0 + luminance * 0.0001) / (1.0 + luminance);
  }
  return vec4(rgb, color.a);
}`,
    gpu: `fn effect(uv: vec2<f32>) -> vec4<f32> {
  let color = sampleColor(uv);
  let average = dot(color.rgb, vec3<f32>(1.0 / 3.0));
  var rgb = mix(color.rgb, vec3<f32>(average), fx.uGrade.x);
  rgb = (rgb - 0.5 + fx.uGrade.y) * fx.uGrade.z + 0.5;
  let edge = length(uv - 0.5) * (fx.uVignette.x + fx.uVignette.y);
  rgb = max(rgb * (1.0 - smoothstep(fx.uVignette.y * 0.799, 0.8, edge)), vec3<f32>(0.0));
  if (fx.uReinhard >= 0.0) {
    rgb *= fx.uReinhard;
    let luminance = 10.0 * dot(rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
    rgb *= luminance * (1.0 + luminance * 0.0001) / (1.0 + luminance);
  }
  return vec4<f32>(rgb, color.a);
}`,
  }

  configure(average: number, brightness: number, contrast: number, darkness: number, offset: number, exposure: number): void {
    const gain = contrast > 0 ? 1 / Math.max(1 - contrast, 0.001) : 1 + contrast
    this.uniforms.uniforms.uGrade.set([average, brightness, gain])
    this.uniforms.uniforms.uVignette.set([darkness, offset])
    this.uniforms.uniforms.uReinhard = exposure
    this.uniforms.update()
  }
}

class ScreenTiltShiftEffect extends PostEffect {
  override readonly inputMips = true
  protected readonly uniforms = new UniformGroup({
    uFocus: { value: new Float32Array(4), type: 'vec4<f32>' },
  })

  protected readonly fragment = {
    gl: `vec4 effect(vec2 uv) {
  float distanceToFocus = abs(1.0 - 2.0 * uv.y - uFocus.x);
  float blur = smoothstep(uFocus.y, uFocus.y + max(uFocus.z, 0.001), distanceToFocus);
  return sampleColorLod(uv, log2(1.0 + blur * uFocus.w));
}`,
    gpu: `fn effect(uv: vec2<f32>) -> vec4<f32> {
  let distanceToFocus = abs(1.0 - 2.0 * uv.y - fx.uFocus.x);
  let blur = smoothstep(fx.uFocus.y, fx.uFocus.y + max(fx.uFocus.z, 0.001), distanceToFocus);
  return sampleColorLod(uv, log2(1.0 + blur * fx.uFocus.w));
}`,
  }

  constructor() {
    super({ stage: 'afterToneMapping' })
  }

  configure(offset: number, focusArea: number, feather: number, radius: number): void {
    this.uniforms.uniforms.uFocus.set([offset, focusArea, feather, radius])
    this.uniforms.update()
  }
}

export interface PostProcessingSettings {
  bloom: { enabled: boolean, intensity: number, threshold: number, radius: number }
  colorAverage: { enabled: boolean, opacity: number }
  brightnessContrast: { enabled: boolean, brightness: number, contrast: number }
  vignette: { enabled: boolean, darkness: number, offset: number }
  toneMapping: { enabled: boolean, mode: ToneMappingMode, exposure: number }
  tiltShift: { enabled: boolean, offset: number, focusArea: number, feather: number, radius: number }
}

export interface PostProcessing {
  settings: PostProcessingSettings
  apply: () => void
}

export function createPostProcessing(view: View3D): PostProcessing {
  const settings: PostProcessingSettings = {
    bloom: { enabled: true, intensity: 6, threshold: 0.15, radius: 0.85 },
    colorAverage: { enabled: true, opacity: 0.19 },
    brightnessContrast: { enabled: true, brightness: -0.012, contrast: 0.06 },
    vignette: { enabled: true, darkness: 0.9, offset: 0.1 },
    toneMapping: { enabled: true, mode: 'reinhard2', exposure: 0.94 },
    tiltShift: { enabled: true, offset: 0.02, focusArea: 0.65, feather: 0.45, radius: 12 },
  }

  const bloom = new BloomEffect({ smoothing: 0.3, screenBlend: true, levels: 7 })
  const grade = new GradeEffect()
  const tiltShift = new ScreenTiltShiftEffect()
  view.passes = [bloom, grade, tiltShift]

  const apply = (): void => {
    const glow = settings.bloom
    bloom.enabled = glow.enabled
    bloom.intensity = glow.intensity
    bloom.threshold = glow.threshold
    bloom.radius = glow.radius

    const average = settings.colorAverage
    const contrast = settings.brightnessContrast
    const vignette = settings.vignette
    const tone = settings.toneMapping
    const mode = tone.enabled ? tone.mode : 'none'
    const sceneCurve = mode === 'reinhard2'
    grade.enabled = average.enabled || contrast.enabled || vignette.enabled || sceneCurve
    grade.configure(
      average.enabled ? average.opacity : 0,
      contrast.enabled ? contrast.brightness : 0,
      contrast.enabled ? contrast.contrast : 0,
      vignette.enabled ? vignette.darkness : 0,
      vignette.enabled ? vignette.offset : 0,
      sceneCurve ? tone.exposure : -1,
    )
    view.toneMapping = sceneCurve ? 'none' : mode
    view.exposure = tone.enabled && !sceneCurve ? tone.exposure : 1

    const shift = settings.tiltShift
    tiltShift.enabled = shift.enabled
    tiltShift.configure(shift.offset, Math.max(0, shift.focusArea - shift.feather), shift.feather, shift.radius)
  }

  apply()
  return { settings, apply }
}
