import { CubismFramework, Option } from "@framework/live2dcubismframework";

import { Live2dViewer } from "./live2dViewer";
import { Live2dModel } from "./live2dModel";

export class Live2dManager {
  live2dViewer: Live2dViewer;
  _cubismOptions: Option;

  constructor(live2dViewer: Live2dViewer) {
    this.live2dViewer = live2dViewer;
  }
  
  /**
   * Cubismの初期化
   *
   * @param allocationMemorySize オプショナルで単位はバイト。指定する場合は16MB以上で、それよりも下回る場合は16MBが確保される。複数体モデルを扱う場合は16MBより上を確保するようにした方が良い（ref: https://docs.live2d.com/cubism-sdk-manual/faq/ のql4参照)
   */
  private initializeCubism(allocationMemorySize?: number, outLogFunction?: (message: string) => void) {
        CubismFramework.startUp(this._cubismOptions);
        CubismFramework.initialize(allocationMemorySize);

        if (outLogFunction != null) {
          this._cubismOptions.logFunction = outLogFunction;
        }
  }

  public setOffScreenSize(width: number, height: number): void {
    for (const [_key, val] of this.live2dViewer._models.entries()) {
      const model: Live2dModel = val;
      model.setRenderTargetSize(width, height);
    }
  }

  private initializeView() {
    this.live2dViewer.initialize();
    this.live2dViewer.initializeSprite();
  }

  public initialize() {
    this.initializeView();
    this.setOffScreenSize(this.live2dViewer.canvas.width, this.live2dViewer.canvas.height);
    this.initializeCubism();
  }

  public release() {
    this.live2dViewer.release();
    CubismFramework.dispose();
  }
}
