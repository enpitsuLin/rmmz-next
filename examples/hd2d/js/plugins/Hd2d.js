/* eslint-disable style/spaced-comment */
/*:
 * @target MZ
 * @plugindesc HD-2D 3D diorama renderer for RPG Maker MZ powered by PixiJS 8 and @pixi/3d.
 * @author rmmz-next
 *
 * @param showDebugPanel
 * @text Show Debug Panel
 * @desc Show the lil-gui panel for live tuning of post-processing, fog, dust, and camera.
 * @type boolean
 * @default true
 *
 * @help
 * Replaces the 2D map tilemap and character layer with a PixiJS @pixi/3d
 * HD-2D stage featuring HDR skybox lighting, normal-mapped ground, silhouette
 * cast shadows, dynamic point light tinting, exponential fog, floating dust,
 * bloom + grading + screen-space tilt-shift post-processing, and a 2.5D follow
 * camera.
 *
 * Map Note Tags:
 *   <hd2d-preset:clearing>  Populate the forest clearing diorama.
 *
 * Event Note Tags:
 *   <hd2d-torch>            Attach an animated flickering torch with shadow light.
 *   <hd2d-streetlight>      Attach a swinging street light with shadow light.
 *   <hd2d-board>            Attach a notice board billboard.
 *   <hd2d-rot:0.25>         Override Y rotation (radians) for the prop above.
 *   <hd2d-light color="#ffbb4c" intensity="10" range="3" y="0.85" shadow="false">
 *                           Attach a custom point light to this event.
 */
import { installHd2d } from '../hd2d/install'

installHd2d()
