/**
 * This is based on Darsain's FPSMeter which is under the MIT license.
 * The original can be found at https://github.com/Darsain/fpsmeter.
 */
export class FPSCounter {
  _tickCount: number
  _frameTime: number
  _frameStart: number
  _lastLoop: number
  _showFps: boolean

  fps: number
  duration: number

  _boxDiv!: HTMLDivElement;
  _labelDiv!: HTMLDivElement;
  _numberDiv!: HTMLDivElement;

  constructor() {
    this._tickCount = 0;
    this._frameTime = 100;
    this._frameStart = 0;
    this._lastLoop = performance.now() - 100;
    this._showFps = true;
    this.fps = 0;
    this.duration = 0;
    this._createElements();
    this._update();
  }

  startTick() {
    this._frameStart = performance.now();
  }

  endTick() {
    const time = performance.now();
    const thisFrameTime = time - this._lastLoop;
    this._frameTime += (thisFrameTime - this._frameTime) / 12;
    this.fps = 1000 / this._frameTime;
    this.duration = Math.max(0, time - this._frameStart);
    this._lastLoop = time;
    if (this._tickCount++ % 15 === 0) {
      this._update();
    }
  }

  switchMode() {
    if (this._boxDiv.style.display === "none") {
      this._boxDiv.style.display = "block";
      this._showFps = true;
    } else if (this._showFps) {
      this._showFps = false;
    } else {
      this._boxDiv.style.display = "none";
    }
    this._update();
  }

  _createElements() {
    this._boxDiv = document.createElement("div");
    this._labelDiv = document.createElement("div");
    this._numberDiv = document.createElement("div");
    this._boxDiv.id = "fpsCounterBox";
    this._labelDiv.id = "fpsCounterLabel";
    this._numberDiv.id = "fpsCounterNumber";
    this._boxDiv.style.display = "none";
    this._boxDiv.appendChild(this._labelDiv);
    this._boxDiv.appendChild(this._numberDiv);
    document.body.appendChild(this._boxDiv);
  }

  _update() {
    const count = this._showFps ? this.fps : this.duration;
    this._labelDiv.textContent = this._showFps ? "FPS" : "ms";
    this._numberDiv.textContent = count.toFixed(0);
  }
}
