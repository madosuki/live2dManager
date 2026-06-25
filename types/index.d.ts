import type { Option } from "../CubismSdkForWeb/src/live2dcubismframework.d.ts";
import type { CubismLook } from "../CubismSdkForWeb/src/effect/cubismlook.d.ts";
import type { ICubismModelSetting } from "../CubismSdkForWeb/src/icubismmodelsetting.d.ts";
import type { CubismIdHandle } from "../CubismSdkForWeb/src/id/cubismid.d.ts";
import type { CubismMatrix44 } from "../CubismSdkForWeb/src/math/cubismmatrix44.d.ts";
import type { CubismViewMatrix } from "../CubismSdkForWeb/src/math/cubismviewmatrix.d.ts";
import type { CubismUserModel } from "../CubismSdkForWeb/src/model/cubismusermodel.d.ts";
import type {
  ACubismMotion,
  FinishedMotionCallback,
} from "../CubismSdkForWeb/src/motion/acubismmotion.d.ts";
import type { CubismMotionQueueEntryHandle } from "../CubismSdkForWeb/src/motion/cubismmotionqueuemanager.d.ts";
import type { csmRect } from "../CubismSdkForWeb/src/type/csmrectf.d.ts";

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

export type ReadFileFunction = (filePath: string) => Promise<ArrayBuffer>;

declare class WavFileInfo {
  constructor();
  _fileName: string;
  _numberOfChannels: number;
  _bitsPerSample: number;
  _samplingRate: number;
  _samplesPerChannel: number;
}

declare class ByteReader {
  constructor();
  get8(): number;
  get16LittleEndian(): number;
  get24LittleEndian(): number;
  get32LittleEndian(): number;
  getCheckSignature(reference: string): boolean;
  _fileByte: ArrayBuffer | null;
  _fileDataView: DataView | null;
  _fileSize: number;
  _readOffset: number;
}

declare class LAppWavFileHandler {
  constructor();
  update(deltaTimeSeconds: number): boolean;
  startWithBytes(bytes: ArrayBuffer): Promise<void>;
  start(filePath: string): void;
  getParameter(): number;
  getRms(): number;
  loadWav(bytes: ArrayBuffer): Promise<boolean>;
  loadWavFile(filePath: string): Promise<boolean>;
  getPcmSample(): number;
  getPcmDataChannel(usechannel: number): Float32Array | null;
  getWavSamplingRate(): number | null;
  releasePcmData(): void;
  _loadFiletoBytes: (arrayBuffer: ArrayBuffer, length: number) => void;
  _pcmData: Array<Float32Array> | null;
  _userTimeSeconds: number;
  _lastRms: number;
  _sampleOffset: number;
  _wavFileInfo: WavFileInfo;
  _byteReader: ByteReader;
}

export declare class TouchManager {
  constructor();
  getCenterX(): number;
  getCenterY(): number;
  getDeltaX(): number;
  getDeltaY(): number;
  getStartX(): number;
  getStartY(): number;
  getScale(): number;
  getX(): number;
  getY(): number;
  getX1(): number;
  getY1(): number;
  getX2(): number;
  getY2(): number;
  isSingleTouch(): boolean;
  isFlickAvailable(): boolean;
  disableFlick(): void;
  touchesBegan(deviceX: number, deviceY: number): void;
  touchesMoved(deviceX: number, deviceY: number): void;
  getFlickDistance(): number;
  calculateDistance(x1: number, y1: number, x2: number, y2: number): number;
  calculateMovingAmount(v1: number, v2: number): number;

  _startY: number;
  _startX: number;
  _lastX: number;
  _lastY: number;
  _lastX1: number;
  _lastY1: number;
  _lastX2: number;
  _lastY2: number;
  _lastTouchDistance: number;
  _deltaX: number;
  _deltaY: number;
  _scale: number;
  _touchSingle: boolean;
  _flipAvailable: boolean;
}

export declare class Live2dViewer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext | null;
  frameBuffer: WebGLFramebuffer | null;
  _models: Map<string, Live2dModel>;
  _programId: WebGLProgram | undefined;
  _viewMatrix: CubismViewMatrix;
  _cubismOptions: Option;
  isSetupComplete: boolean;
  isDown: boolean;
  _deviceToScreen: CubismMatrix44;
  _touchManager: TouchManager;

  constructor(canvas: HTMLCanvasElement, width?: number, height?: number);
  getCurrentModelKey(): string;
  onTouchesBegin(pointX: number, pointY: number): void;
  onTouchesMoved(pointX: number, pointY: number): void;
  onTouchesEnded(): void;
  onTouchesCancel(): void;
  transformViewX(deviceX: number): number;
  transformViewY(deviceY: number): number;
  addModel(key: string, model: Live2dModel): void;
  setCurrentModelk(targetKey: string): boolean;
  getModelFromKey(targetKey: string): Live2dModel | undefined;
  updateCoordinate(x: number, y: number): void;
  initializeSprite(): void;
  scaleSetting(): void;
  initialize(): void;
  resize(width: number, height: number): void;
  deleteTexture(webGlTexture: WebGLTexture): void;
  releaseModel(targetKey: string): void;
  releaseAllModel(): void;
  release(): void;
  getNewMatrix44(): CubismMatrix44;
  updateTime(): void;
  runSingleModel(): void;
}

export declare class Live2dModel extends CubismUserModel {
  _live2dViewer: Live2dViewer;
  _modelSetting: ICubismModelSetting | null;
  _modelHomeDir: string;
  _modelJsonFileName: string;
  _userTimeSeconds: number;
  _eyeBlinkIds: Array<CubismIdHandle>;
  _lipSyncIds: Array<CubismIdHandle>;
  _motions: Map<string, ACubismMotion>;
  _expressions: Map<string, ACubismMotion>;
  _hitArea: Array<csmRect>;
  _userArea: Array<csmRect>;
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
  _textures: Array<TextureInfo>;
  isCompleteSetup: boolean;
  readFileFunction: ReadFileFunction;
  _wavFileHandler: LAppWavFileHandler;
  lipSyncWeight: number;
  eyeOpenParams: EyeOpenParams;
  isKeepOpenEyeValue: boolean;
  _look: CubismLook | null;
  protected manualClosedEye: boolean;
  protected motionFileList: string[];
  protected motionMap: Map<string, [string, number]>;

  constructor(
    modelHomeDir: string,
    modelJsonFileName: string,
    live2dViewer: Live2dViewer,
    readFileFunction: ReadFileFunction,
    is_old_param_name?: boolean,
  );
  startLipSync(bytes: ArrayBuffer): Promise<void>;
  relase(): void;
  stopLipSync(): void;
  releaseTextures(gl: WebGL2RenderingContext): void;
  releaseTextureByTexture(gl: WebGL2RenderingContext, texture: WebGLTexture): void;
  releaseMotions(): void;
  releaseExpressions(): void;
  closeEyelids(): void;
  openEyelids(): void;
  keepEyeOpenParams(params: EyeOpenParams): void;
  stopKeepEyeValue(): void;
  update(): void;
  loadAssets(isPreloadMotion?: boolean): Promise<void>;
  draw(
    matrix: CubismMatrix44,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    frameBuffer: WebGLFramebuffer | null,
  ): void;
  startMotion(
    group: string,
    no: number,
    onFinishedMotionHandler?: FinishedMotionCallback,
  ): Promise<CubismMotionQueueEntryHandle>;
  setLipSyncWeight(weight: number): void;
  preLoadMotionGroup(group: string): Promise<void>;
  setExpression(expressionId: string): void;
  stopExpression(): void;
  getExpressionIdList(): string[];
  getMotionFileNameList(): string[];
  getMotionGroupAndIndex(motionFileName: string): [string, number] | undefined;
  stopAllMotion(): void;
  setIdleMotion(): void;
  reloadRenderer(): void;
}

export declare class Live2dManager {
  live2dViewer: Live2dViewer;
  _cubismOptions: Option;

  constructor(live2dViewer: Live2dViewer);
  setOffScreenSize(width: number, height: number): void;
  initialize(): void;
  release(): void;
}
