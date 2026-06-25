/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */
import { CubismViewMatrix } from "CubismSdkForWeb/src/math/cubismviewmatrix";
import { Option } from "../CubismSdkForWeb/src/live2dcubismframework";
import { CubismMatrix44 } from "../CubismSdkForWeb/src/math/cubismmatrix44";
import { TouchManager } from "./touchmanager";
import { csmMap } from "../CubismSdkForWeb/src/type/csmmap";
import { Live2dModel } from "./live2dModel";
export declare class Live2dViewer {
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext | null;
    frameBuffer: WebGLFramebuffer | null;
    _models: csmMap<string, Live2dModel>;
    _programId: WebGLProgram | undefined;
    _viewMatrix: CubismViewMatrix;
    _cubismOptions: Option;
    isSetupComplete: boolean;
    isDown: boolean;
    _deviceToScreen: CubismMatrix44;
    _touchManager: TouchManager;
    private targetCurrentModelKey;
    getCurrentModelKey(): string;
    constructor(canvas: HTMLCanvasElement, width?: number, height?: number);
    onTouchesBegin(pointX: number, pointY: number): void;
    onTouchesMoved(pointX: number, pointY: number): void;
    onTouchesEnded(): void;
    onTouchesCancel(): void;
    transformViewX(deviceX: number): number;
    transformViewY(deviceY: number): number;
    addModel(key: string, model: Live2dModel): void;
    setCurrentModel(key: string): boolean;
    getModelFromKey(key: string): Live2dModel | undefined;
    updateCoordinate(x: number, y: number): void;
    initializeSprite(): void;
    scaleSetting(): void;
    initialize(): void;
    private resizeCanvas;
    resize(width: number, height: number): void;
    private createShader;
    deleteTexture(webGlTexture: WebGLTexture): void;
    releaseModel(key: string): void;
    releaseAllModel(): void;
    release(): void;
    getNewMatrix44(): CubismMatrix44;
    updateTime(): void;
    runSingleModel(): void;
}
