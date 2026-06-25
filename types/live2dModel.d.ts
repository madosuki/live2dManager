/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */
import { ICubismModelSetting } from "../CubismSdkForWeb/src/icubismmodelsetting";
import { CubismIdHandle } from "../CubismSdkForWeb/src/id/cubismid";
import { CubismMatrix44 } from "../CubismSdkForWeb/src/math/cubismmatrix44";
import { CubismUserModel } from "../CubismSdkForWeb/src/model/cubismusermodel";
import { ACubismMotion, FinishedMotionCallback } from "../CubismSdkForWeb/src/motion/acubismmotion";
import { CubismMotionQueueEntryHandle } from "../CubismSdkForWeb/src/motion/cubismmotionqueuemanager";
import { csmMap } from "../CubismSdkForWeb/src/type/csmmap";
import { csmRect } from "../CubismSdkForWeb/src/type/csmrectf";
import { csmVector } from "../CubismSdkForWeb/src/type/csmvector";
import { LAppWavFileHandler } from "./lappwavfilehandler";
import { Live2dViewer } from "./live2dViewer";
declare class TextureInfo {
    imageUrl: string;
    img: HTMLImageElement;
    id: WebGLTexture | undefined;
    width: number;
    height: number;
    usePremulitply: boolean;
    fileName: string;
    constructor();
}
export type EyeOpenParams = {
    lOpen?: number;
    rOpen?: number;
};
export declare class Live2dModel extends CubismUserModel {
    _live2dViewer: Live2dViewer;
    _modelSetting: ICubismModelSetting | null;
    _modelHomeDir: string;
    _modelJsonFileName: string;
    _userTimeSeconds: number;
    _eyeBlinkIds: csmVector<CubismIdHandle>;
    _lipSyncIds: csmVector<CubismIdHandle>;
    _motions: csmMap<string, ACubismMotion>;
    _expressions: csmMap<string, ACubismMotion>;
    _hitArea: csmVector<csmRect>;
    _userArea: csmVector<csmRect>;
    _idParamAngleX: CubismIdHandle;
    _idParamAngleY: CubismIdHandle;
    _idParamAngleZ: CubismIdHandle;
    _idParamEyeBallX: CubismIdHandle;
    _idParamEyeBallY: CubismIdHandle;
    _idParamBodyAngleX: CubismIdHandle;
    _idParamEyeLOpen: CubismIdHandle;
    _idParamEyeROpen: CubismIdHandle;
    _state: number;
    _expressionCount: number;
    _textureCount: number;
    _motionCount: number;
    _allMotionCount: number;
    _textures: csmVector<TextureInfo>;
    isCompleteSetup: boolean;
    readFileFunction: (arg: string) => Promise<ArrayBuffer>;
    _wavFileHandler: LAppWavFileHandler;
    lipSyncWeight: number;
    eyeOpenParams: EyeOpenParams;
    isKeepOpenEyeValue: boolean;
    protected manualClosedEye: boolean;
    protected motionFileList: string[];
    protected motionMap: Map<string, [string, number]>;
    startLipSync(bytes: ArrayBuffer): Promise<void>;
    stopLipSync(): void;
    releaseTextures(): void;
    releaseTextureByTexture(texture: WebGLTexture): void;
    releaseMotions(): void;
    releaseExpressions(): void;
    closeEyelids(): void;
    openEyelids(): void;
    keepEyeOpenParams(params: EyeOpenParams): void;
    stopKeepEyeValue(): void;
    update(): void;
    protected createTextureFromFile(fileName: string, usePremultiply: boolean, index: number, textureCount: number): Promise<void>;
    protected loadTextures(): Promise<void>;
    /**
     * model3.jsonからモデルを生成する。
     * model3.jsonの記述に従ってモデル生成、モーション、物理演算などのコンポーネント生成を行う。
     *
     * @param setting ICubismModelSettingのインスタンス
     */
    protected setupModel(setting: ICubismModelSetting, isPreloadMotion: boolean): Promise<void>;
    loadAssets(isPreloadMotion?: boolean): Promise<void>;
    draw(matrix: CubismMatrix44, x: number, y: number, canvasWidth: number, canvasHeight: number, frameBuffer: WebGLFramebuffer | null): void;
    /**
     * 引数で指定したモーションの再生を開始する
     * @param group モーショングループ名
     * @param no グループ内の番号
     * @param priority 優先度
     * @param onFinishedMotionHandler モーション再生終了時に呼び出されるコールバック関数
     * @return 開始したモーションの識別番号を返す。個別のモーションが終了したか否かを判定するisFinished()の引数で使用する。開始できない時は[-1]
     */
    startMotion(group: string, no: number, onFinishedMotionHandler?: FinishedMotionCallback): Promise<CubismMotionQueueEntryHandle>;
    setLipSyncWeight(weight: number): void;
    /**
     * モーションデータをグループ名から一括でロードする。
     * モーションデータの名前は内部でModelSettingから取得する。
     *
     * @param group モーションデータのグループ名
     */
    preLoadMotionGroup(group: string): Promise<void>;
    /**
     * 引数で指定した表情モーションをセットする
     *
     * @param expressionId 表情モーションのID
     */
    setExpression(expressionId: string): void;
    stopExpression(): void;
    getExpressionIdList(): string[];
    getMotionFileNameList(): string[];
    getMotionGroupAndIndex(motionFileName: string): [string, number] | undefined;
    stopAllMotion(): void;
    setIdleMotion(): void;
    reloadRenderer(): void;
    constructor(modelHomeDir: string, modelJsonFileName: string, live2dViewer: Live2dViewer, readFileFunction: (arg: string) => Promise<ArrayBuffer>, is_old_param_name?: boolean);
}
export {};
