import { Scene_Nightward } from './Scene_Nightward'

// Share the graveyard simulation, while keeping the title outside Scene_Title's layout.
export class Scene_NightwardTitle extends Scene_Nightward {
  protected override demo = true
}
