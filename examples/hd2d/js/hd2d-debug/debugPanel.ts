import type { FollowCamera } from '../hd2d/scene/camera'
import type { Dust } from '../hd2d/scene/dust'
import type { Fog } from '../hd2d/scene/fog'
import type { PostProcessing } from '../hd2d/scene/postProcessing'
import type { ColliderDebug } from './colliderDebug'
import type { OrbitDebug } from './orbitDebug'
import GUI from 'lil-gui'
import { TONE_MAPPING_MODES } from '../hd2d/scene/postProcessing'

export function createDebugPanel(
  post: PostProcessing,
  fog: Fog,
  dust: Dust,
  camera: FollowCamera,
  colliderDebug: ColliderDebug,
  orbitDebug: OrbitDebug,
  openByDefault = true,
): GUI {
  const gui = new GUI({ title: 'HD-2D 调试面板' })
  gui.domElement.style.zIndex = '1000'
  if (!openByDefault)
    gui.close()

  // Stop DOM events from leaking into RMMZ Input/TouchInput listeners.
  for (const eventName of ['mousedown', 'mouseup', 'mousemove', 'pointerdown', 'pointerup', 'wheel', 'touchstart', 'touchmove', 'keydown', 'keyup']) {
    gui.domElement.addEventListener(eventName, (event) => {
      event.stopPropagation()
    })
  }

  const effects = gui.addFolder('后期特效')
  const particles = gui.addFolder('粒子')
  const cameraFolder = gui.addFolder('相机')

  effects.close()
  particles.close()
  cameraFolder.close()

  const postSettings = post.settings

  const bloom = effects.addFolder('泛光')
  bloom.add(postSettings.bloom, 'enabled').name('启用').onChange(post.apply)
  bloom.add(postSettings.bloom, 'intensity', 0, 10, 0.01).name('强度').onChange(post.apply)
  bloom.add(postSettings.bloom, 'threshold', 0, 1, 0.01).name('阈值').onChange(post.apply)
  bloom.add(postSettings.bloom, 'radius', 0, 1, 0.01).name('扩散范围').onChange(post.apply)
  bloom.close()

  const colorAverage = effects.addFolder('平均色')
  colorAverage.add(postSettings.colorAverage, 'enabled').name('启用').onChange(post.apply)
  colorAverage.add(postSettings.colorAverage, 'opacity', 0, 1, 0.01).name('不透明度').onChange(post.apply)
  colorAverage.close()

  const brightnessContrast = effects.addFolder('亮度对比度')
  brightnessContrast.add(postSettings.brightnessContrast, 'enabled').name('启用').onChange(post.apply)
  brightnessContrast.add(postSettings.brightnessContrast, 'brightness', -1, 1, 0.01).name('亮度').onChange(post.apply)
  brightnessContrast.add(postSettings.brightnessContrast, 'contrast', -1, 1, 0.01).name('对比度').onChange(post.apply)
  brightnessContrast.close()

  const vignette = effects.addFolder('暗角')
  vignette.add(postSettings.vignette, 'enabled').name('启用').onChange(post.apply)
  vignette.add(postSettings.vignette, 'darkness', 0, 1, 0.01).name('暗度').onChange(post.apply)
  vignette.add(postSettings.vignette, 'offset', 0, 1, 0.01).name('偏移').onChange(post.apply)
  vignette.close()

  const toneMapping = effects.addFolder('色调映射')
  toneMapping.add(postSettings.toneMapping, 'enabled').name('启用').onChange(post.apply)
  toneMapping.add(postSettings.toneMapping, 'mode', TONE_MAPPING_MODES).name('模式').onChange(post.apply)
  toneMapping.add(postSettings.toneMapping, 'exposure', 0, 2, 0.01).name('曝光').onChange(post.apply)
  toneMapping.close()

  const tiltShift = effects.addFolder('移轴景深')
  tiltShift.add(postSettings.tiltShift, 'enabled').name('启用').onChange(post.apply)
  tiltShift.add(postSettings.tiltShift, 'offset', -0.5, 0.5, 0.01).name('焦点位置').onChange(post.apply)
  tiltShift.add(postSettings.tiltShift, 'focusArea', 0, 1, 0.01).name('清晰带宽度').onChange(post.apply)
  tiltShift.add(postSettings.tiltShift, 'feather', 0, 1, 0.01).name('边缘羽化').onChange(post.apply)
  tiltShift.add(postSettings.tiltShift, 'radius', 0, 30, 1).name('模糊半径').onChange(post.apply)
  tiltShift.close()

  const fogFolder = gui.addFolder('雾')
  fogFolder.add(fog.settings, 'enabled').name('启用').onChange(fog.apply)
  fogFolder.add(fog.settings, 'density', 0, 0.3, 0.005).name('浓度').onChange(fog.apply)
  fogFolder.addColor(fog.settings, 'color').name('颜色').onChange(fog.apply)
  fogFolder.close()

  const dustFolder = particles.addFolder('浮尘')
  dustFolder.add(dust.settings, 'enabled').name('启用').onChange(dust.apply)
  dustFolder.add(dust.settings, 'size', 0, 0.05, 0.001).name('尺寸').onChange(dust.apply)
  dustFolder.add(dust.settings, 'randomness', 0, 10, 0.1).name('随机度').onChange(dust.apply)
  dustFolder.add(dust.settings, 'speed', 0, 0.05, 0.001).name('速度').onChange(dust.apply)
  dustFolder.add(dust.settings, 'count', 0, 200, 1).name('数量').onChange(dust.apply)
  dustFolder.addColor(dust.settings, 'color').name('颜色').onChange(dust.apply)
  dustFolder.close()

  cameraFolder.add(orbitDebug.settings, 'enabled').name('自由旋转平移').onChange(orbitDebug.apply)
  cameraFolder.add(orbitDebug, 'reset').name('重置自由视角')
  cameraFolder.add(camera.settings, 'follow').name('跟随玩家').onChange(camera.apply)
  cameraFolder.add(camera.settings, 'fov', 25, 75, 1).name('视野 FOV').onChange(camera.apply)
  cameraFolder.add(camera.settings, 'offsetY', 0.6, 5, 0.05).name('相机高度').onChange(camera.apply)
  cameraFolder.add(camera.settings, 'offsetZ', 2, 12, 0.05).name('相机距离').onChange(camera.apply)
  cameraFolder.add(camera.settings, 'lookAtY', -0.5, 1.5, 0.05).name('焦点高度').onChange(camera.apply)
  cameraFolder.add(camera.settings, 'damping', 1, 20, 0.5).name('跟随平滑度')

  const colliderFolder = gui.addFolder('碰撞箱')
  colliderFolder.add(colliderDebug.settings, 'enabled').name('显示碰撞箱').onChange(colliderDebug.apply)
  colliderFolder.add(colliderDebug.settings, 'showTiles').name('图块碰撞').onChange(colliderDebug.apply)
  colliderFolder.add(colliderDebug.settings, 'showEvents').name('事件碰撞').onChange(colliderDebug.apply)
  colliderFolder.add(colliderDebug.settings, 'showPlayer').name('玩家碰撞').onChange(colliderDebug.apply)
  colliderFolder.close()

  return gui
}
