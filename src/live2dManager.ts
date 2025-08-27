import { CubismFramework, Option } from "@framework/live2dcubismframework";
import { CubismMotionSync, MotionSyncOption } from "@motionsyncframework/live2dcubismmotionsync";

import { Live2dViewer } from "./live2dViewer";
import { Live2dModel } from "./live2dModel";
import { Live2dMotionSyncModel } from "./live2dMotionSyncModel";
import { csmVector } from "@framework/type/csmvector";
import { csmPair } from "@framework/type/csmmap";

export class Live2dManager {
  live2dViewer: Live2dViewer;
  _cubismOptions: Option;
  _cubismMotionSyncOptions: MotionSyncOption;

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

        CubismMotionSync.startUp(this._cubismMotionSyncOptions);
        CubismMotionSync.initialize();

        if (outLogFunction != null) {
          this._cubismOptions.logFunction = outLogFunction;
          this._cubismMotionSyncOptions.logFunction = outLogFunction;
        }
  }

  private initializeView() {
    this.live2dViewer.initialize();
    this.live2dViewer.initializeSprite();
  }

  public initialize() {
    this.initializeView();
    this.initializeCubism();
  }

  public release() {
    this.live2dViewer.release();
    CubismFramework.dispose();
  }
}
