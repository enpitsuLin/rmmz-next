import { Scene_Boot } from 'rmmz-next'

const Scene_Boot_start = Scene_Boot.prototype.start

Scene_Boot.prototype.start = function () {
  Scene_Boot_start.call(this)
  console.log('TestPlugin is loaded!')
}
