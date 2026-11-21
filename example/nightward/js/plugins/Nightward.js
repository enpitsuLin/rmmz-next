/*:
 * @target MZ
 * @plugindesc Nightward — a complete 3D survivor mode powered by RMMZ data.
 * @author rmmz-next
 *
 * @command Start
 * @text Start Nightward
 * @desc Start a fresh run in the graveyard.
 *
 * @command Pause
 * @text Pause Nightward
 * @desc Open the current run's pause overlay.
 *
 * @help
 * Enable this plugin in the Plugin Manager. It replaces the title scene and
 * provides the graveyard, six weapons, four passives, enemies and Reaper fight.
 * Requires @pixi/3d and rmmz-next. All content lives in the standard database.
 *
 * Move: WASD / arrows / gamepad / drag. Weapons fire automatically.
 * Pause: Esc / P / Start. M: mute. F: fullscreen. 1–3: select an upgrade.
 * Records and options are saved separately from normal RPG Maker save files.
 */
import { installNightward } from '../nightward/install'

installNightward()
