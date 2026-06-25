import { Option } from "@framework/live2dcubismframework";
import { Live2dViewer } from "./live2dViewer";
export declare class Live2dManager {
    live2dViewer: Live2dViewer;
    _cubismOptions: Option;
    constructor(live2dViewer: Live2dViewer);
    /**
     * Cubismの初期化
     *
     * @param allocationMemorySize オプショナルで単位はバイト。指定する場合は16MB以上で、それよりも下回る場合は16MBが確保される。複数体モデルを扱う場合は16MBより上を確保するようにした方が良い（ref: https://docs.live2d.com/cubism-sdk-manual/faq/ のql4参照)
     */
    private initializeCubism;
    setOffScreenSize(width: number, height: number): void;
    private initializeView;
    initialize(): void;
    release(): void;
}
