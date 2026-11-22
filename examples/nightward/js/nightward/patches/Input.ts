import { Input, TouchInput } from 'rmmz-next'

interface NightwardInputClass {
  clearEdge: () => void
}

interface NightwardTouchInputClass {
  clearEdge: () => void
}

export const NightwardInput = Input as typeof Input & NightwardInputClass
export const NightwardTouchInput = TouchInput as typeof TouchInput & NightwardTouchInputClass

export function installInputPatch(): void {
  Object.assign(Input.keyMapper, {
    65: 'left',
    68: 'right',
    87: 'up',
    83: 'down',
    80: 'pause',
    77: 'mute',
    70: 'fullscreen',
    49: 'choice1',
    50: 'choice2',
    51: 'choice3',
  })
  Input.gamepadMapper[9] = 'pause'

  // Keep held movement keys while consuming the menu's activation edge.
  NightwardInput.clearEdge = function (): void {
    this._previousState = { ...this._currentState }
    this._latestButton = null
    this._pressedTime = 0
    this._virtualButton = null
  }

  NightwardTouchInput.clearEdge = function (): void {
    this._currentState = this._createNewState()
    this._newState = this._createNewState()
    this._clicked = false
  }
}

export function clearInputEdge(): void {
  NightwardInput.clearEdge()
  NightwardTouchInput.clearEdge()
}
