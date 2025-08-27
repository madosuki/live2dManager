/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import {
  CubismMotionSync,
  MotionSyncOption,
} from "@motionsyncframework/live2dcubismmotionsync";
import { CubismViewMatrix } from "CubismSdkForWeb/src/math/cubismviewmatrix";
import {
  CubismFramework,
  Option,
} from "../CubismSdkForWeb/src/live2dcubismframework";
import { CubismMatrix44 } from "../CubismSdkForWeb/src/math/cubismmatrix44";
import { LAppPal } from "./lapppal";
import { TouchManager } from "./touchmanager";

import { csmMap, csmPair, iterator } from "../CubismSdkForWeb/src/type/csmmap";
import { Live2dModel } from "./live2dModel";
import { Live2dMotionSyncModel } from "./live2dMotionSyncModel";

function outLog(message: string): void {
  console.log(`log message: ${message}`);
}

export class Live2dViewer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | null;
  frameBuffer: WebGLFramebuffer | null;
  _models: csmMap<string, Live2dModel | Live2dMotionSyncModel>;
  _programId: WebGLProgram | undefined;
  _viewMatrix: CubismViewMatrix;
  _cubismOptions: Option;
  _cubismMotionSyncOptions: MotionSyncOption;
  isSetupComplete: boolean;
  isDown: boolean;
  _deviceToScreen: CubismMatrix44;
  _touchManager: TouchManager;
  private targetCurrentModelKey: string;

  getCurrentModelKey(): string {
    return this.targetCurrentModelKey;
  }

  constructor(canvas: HTMLCanvasElement, width?: number, height?: number) {
    this.canvas = canvas;
    this.canvas.width = width ?? 800;
    this.canvas.height = height ?? 800;
    this.gl = null;
    this.frameBuffer = null;

    this._viewMatrix = new CubismViewMatrix();
    this._cubismOptions = new Option();
    this._cubismMotionSyncOptions = new MotionSyncOption();
    this._deviceToScreen = new CubismMatrix44();
    this.isSetupComplete = false;
    this.isDown = false;

    this._models = new csmMap();

    this._touchManager = new TouchManager();
    this.targetCurrentModelKey = "";
  }

  public onTouchesBegin(pointX: number, pointY: number): void {
    const insideCanvasX = pointX - this.canvas.offsetLeft;
    const insideCanvasY = pointY - this.canvas.offsetTop;
    this._touchManager.touchesBegan(insideCanvasX, insideCanvasY);
  }

  public onTouchesMoved(pointX: number, pointY: number): void {
    const x = this.transformViewX(this._touchManager.getX());
    const y = this.transformViewY(this._touchManager.getY());

    const modifiedPointX = (pointX - this.canvas.offsetLeft) * window.devicePixelRatio;
    const modifiedPointY = (pointY - this.canvas.offsetTop) * window.devicePixelRatio;
    this._touchManager.touchesMoved(modifiedPointX, modifiedPointY);

    this.updateCoordinate(x, y);
  }

  public onTouchesEnded(): void {
    this.updateCoordinate(0.0, 0.0);
  }

  public onTouchesCancel(): void {
    this.updateCoordinate(0.0, 0.0);
  }

  public transformViewX(deviceX: number): number {
    const screenX = this._deviceToScreen.transformX(deviceX);
    return this._viewMatrix.invertTransformX(screenX);
  }

  public transformViewY(deviceY: number): number {
    const screenY = this._deviceToScreen.transformY(deviceY);
    return this._viewMatrix.invertTransformY(screenY);
  }

  public addModel(
    key: string,
    model: Live2dModel | Live2dMotionSyncModel,
  ): void {
    this._models.appendKey(key);
    this._models.setValue(key, model);
  }

  public setCurrentModel(key: string): boolean {
    const keyValues = this._models._keyValues;
    for (const k of keyValues) {
      if (k != null && k.first != null && k.second != null && k.first === key) {
        this.targetCurrentModelKey = key;
        return true;
      }
    }

    return false;
  }

  public getModelFromKey(
    key: string,
  ): Live2dModel | Live2dMotionSyncModel | undefined {
    const keyValues = this._models._keyValues;
    for (const k of keyValues) {
      if (k != null && k.first != null && k.second != null && k.first === key) {
        return k.second;
      }
    }

    return undefined;
  }

  public updateCoordinate(x: number, y: number): void {
    const model: Live2dModel | Live2dMotionSyncModel | undefined =
      this.getModelFromKey(this.targetCurrentModelKey);
    if (model != null) {
      model.setDragging(x, y);
    }
  }

  public initializeSprite(): void {
    const tmp = this.createShader();
    if (tmp == null) {
      throw new Error("failed createShader");
    }

    this._programId = tmp;
  }

  public scaleSetting(): void {
    const width = this.canvas.width;
    const height = this.canvas.height;

    const ratio = width / height;
    const left = -ratio;
    const right = ratio;
    const bottom = -1.0;
    const top = 1.0;
    this._viewMatrix.setScreenRect(left, right, bottom, top);
    this._viewMatrix.scale(1.0, 1.0);
    this._viewMatrix.setMaxScale(2.0);
    this._viewMatrix.setMinScale(0.8);

    this._deviceToScreen.loadIdentity();
    if (this.canvas.width > this.canvas.height) {
      const screenW = Math.abs(right - left);
      this._deviceToScreen.scaleRelative(
        screenW / this.canvas.width,
        -screenW / this.canvas.width,
      );
    } else {
      const screenH = Math.abs(top - bottom);
      this._deviceToScreen.scaleRelative(
        screenH / this.canvas.height,
        -screenH / this.canvas.height,
      );
    }
    this._deviceToScreen.translateRelative(
      -this.canvas.width * 0.5,
      -this.canvas.height * 0.5,
    );

    
    this._viewMatrix.setMaxScreenRect(-2.0, 2.0, -2.0, 2.0);
  }

  public initialize(): void {
    this.gl = this.canvas.getContext("webgl2") as WebGLRenderingContext | null;
    if (this.gl == null) {
      throw new Error(this.gl.getError().toString());
    }

    if (!this.frameBuffer) {
      this.frameBuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    }

    // 透過設定
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.scaleSetting();
  }

  private resizeCanvas(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);    
  }

  public resize(width: number, height: number) {
    this.resizeCanvas(width, height);
    this.initialize();
    this.initializeSprite();
  }

  private createShader(): WebGLProgram | undefined {
    if (this.gl == null) {
      return undefined;
    }

    const vertexShaderId = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (vertexShaderId == null) {
      console.log("vertexShaderId is null");
      return undefined;
    }

    const vertexShader: string =
      "precision mediump float;" +
      "attribute vec3 position;" +
      "attribute vec2 uv;" +
      "varying vec2 vuv;" +
      "void main(void)" +
      "{" +
      "   gl_Position = vec4(position, 1.0);" +
      "   vuv = uv;" +
      "}";

    this.gl.shaderSource(vertexShaderId, vertexShader);
    this.gl.compileShader(vertexShaderId);

    const fragmentShaderId = this.gl.createShader(this.gl.FRAGMENT_SHADER);
    if (fragmentShaderId == null) {
      console.log("fragment shader id is null");
      return undefined;
    }

    const fragmentShader: string =
      "precision mediump float;" +
      "varying vec2 vuv;" +
      "uniform sampler2D texture;" +
      "void main(void)" +
      "{" +
      "   gl_FragColor = texture2D(texture, vuv);" +
      "}";

    this.gl.shaderSource(fragmentShaderId, fragmentShader);
    this.gl.compileShader(fragmentShaderId);

    const programId = this.gl.createProgram();
    this.gl.attachShader(programId, vertexShaderId);
    this.gl.attachShader(programId, fragmentShaderId);

    this.gl.deleteShader(vertexShaderId);
    this.gl.deleteShader(fragmentShaderId);

    this.gl.linkProgram(programId);

    this.gl.useProgram(programId);

    return programId;
  }

  public deleteTexture(webGlTexture: WebGLTexture): void {
    this.gl.deleteTexture(webGlTexture);
  }

  public releaseModel(key: string): void {
    const keys: csmPair<string, Live2dModel | Live2dMotionSyncModel>[] = this._models._keyValues;
    let index = 0;
    let isModelReleased = false;
    for (const i of keys) {
      // It's a workaround. prepend missing property when after build.
      if (i != null && i.first === key  && i.second != null) {
        const model: Live2dModel | Live2dMotionSyncModel = i.second;
        model.releaseTextures();
        model.releaseExpressions();
        model.releaseMotions();
        model.release();
        isModelReleased = true;
        break;
      }
      ++index;
    }
    if (isModelReleased) {
      this._models._keyValues.splice(index, 1);
      --this._models._size;
    }
  }

  public releaseAllModel(): void {
    const keys: csmPair<string, Live2dModel | Live2dMotionSyncModel>[] =
      this._models._keyValues;
    for (const i of keys) {
      // It's a workaround. prepend missing property when after build.
      if (i != null && i.second != null) {
        const model: Live2dModel | Live2dMotionSyncModel = i.second;
        model.releaseTextures();
        model.releaseExpressions();
        model.releaseMotions();
        model.release();
      }
    }

    this._models.clear();
  }

  public release(): void {
    this.releaseAllModel();

    this.gl.deleteProgram(this._programId);
    this._viewMatrix = null;
    this._deviceToScreen = null;
  }

  public getNewMatrix44(): CubismMatrix44 {
    return new CubismMatrix44();
  }

  public updateTime(): void {
    LAppPal.updateTime();
  }

  public runSingleModel(): void {
    let isValidTargetCurrentModelKey = false;
    for (let i = 0; i < this._models.getSize(); ++i) {
      if (this._models._keyValues[i].first === this.targetCurrentModelKey) {
        isValidTargetCurrentModelKey = true;
      }
    }

    if (!isValidTargetCurrentModelKey) return;

    const loop = () => {
      if (!this.gl) {
        return;
      }

      this.updateTime();

      this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.depthFunc(this.gl.LEQUAL);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      this.gl.clearDepth(1.0);

      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

      if (this._programId) {
        this.gl.useProgram(this._programId);
      }
      this.gl.flush();

      const { width, height } = this.canvas;

      const projection = new CubismMatrix44();

      const model: Live2dModel | Live2dMotionSyncModel = this._models.getValue(
        this.targetCurrentModelKey,
      );
      const draw = () => {
        if (model.getModel()) {
          if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
            model.getModelMatrix().setWidth(2.0);
            projection.scale(1.0, width / height);
          } else {
            projection.scale(height / width, 1.0);
          }

          projection.multiplyByMatrix(this._viewMatrix);

          model.update();
          model.draw(projection, 0, 0, width, height, this.frameBuffer);
        }
      };

      if (model.isCompleteSetup) {
        draw();
      }

      requestAnimationFrame(loop);
    };

    loop();
  }
}
