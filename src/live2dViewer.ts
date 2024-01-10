/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import {
  CubismFramework,
  Option,
} from "../CubismWebFramework/src/live2dcubismframework";
import { CubismMatrix44 } from "../CubismWebFramework/src/math/cubismmatrix44";
import { CubismViewMatrix } from "../CubismWebFramework/src/math/cubismviewmatrix";
import { TouchManager } from "./touchmanager";
import { LAppPal } from "./lapppal";

import { Live2dModel } from "./live2dModel";

function outLog(message: string): void {
  console.log(`log message: ${message}`);
}

export class Live2dViewer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | null;
  frameBuffer: WebGLFramebuffer | null;
  _models: Record<string, Live2dModel>;
  _programId: WebGLProgram | undefined;
  _viewMatrix: CubismViewMatrix;
  _cubismOptions: Option;
  isSetupComplete: boolean;
  isDown: boolean;
  _deviceToScreen: CubismMatrix44;
  _touchManager: TouchManager;
  targetCurrentModelKey: string;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = 800;
    this.canvas.height = 800;
    this.gl = null;
    this.frameBuffer = null;

    this._viewMatrix = new CubismViewMatrix();
    this._cubismOptions = new Option();
    this._deviceToScreen = new CubismMatrix44();
    this.isSetupComplete = false;
    this.isDown = false;
    
    this._models = {};

    this._touchManager = new TouchManager();
    this.targetCurrentModelKey = "";
  }

  public onTouchesBegin(pointX: number, pointY: number): void {
    this._touchManager.touchesBegan(pointX, pointY);
  }

  public onTouchesMoved(pointX: number, pointY: number): void {
    const x = this.transformViewX(this._touchManager.getX());
    const y = this.transformViewY(this._touchManager.getY());

    this._touchManager.touchesMoved(pointX, pointY);
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

  public addModel(key: string, model: Live2dModel): void {
    this._models[key] = model;
  }

  public setCurrentModel(key: string): boolean {
    if (this._models[key] != undefined) {
      return false;
    }

    this.targetCurrentModelKey = key;
    return true;
  }

  public updateCoordinate(x: number, y: number): void {
    const model = this._models[this.targetCurrentModelKey];
    if (model) {
      model.setDragging(x, y);
    }
  }

  private initializeSprite(): void {
    const tmp = this.createShader();
    this._programId = tmp;
  }

  public initialize(): void {
    this.gl =
      this.canvas.getContext("webgl") ||
      (this.canvas.getContext(
        "experimental-webgl"
      ) as WebGLRenderingContext | null);
    if (!this.gl) {
      console.log(this.gl.getError());
      return;
    }

    if (!this.frameBuffer) {
      this.frameBuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    }

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    const ratio = 800 / 800;
    const left = -ratio;
    const right = ratio;
    const bottom = -1.0;
    const top = 1.0;
    this._viewMatrix.setScreenRect(left, right, bottom, top);
    this._viewMatrix.scale(1.0, 1.0);
    this._viewMatrix.setMaxScale(2.0);
    this._viewMatrix.setMinScale(0.8);

    this._cubismOptions.logFunction = outLog;

    this._deviceToScreen.loadIdentity();
    if (this.canvas.width > this.canvas.height) {
      const screenW = Math.abs(right - left);
      this._deviceToScreen.scaleRelative(
        screenW / this.canvas.width,
        -screenW / this.canvas.width
      );
    } else {
      const screenH = Math.abs(top - bottom);
      this._deviceToScreen.scaleRelative(
        screenH / this.canvas.height,
        -screenH / this.canvas.height
      );
    }
    this._deviceToScreen.translateRelative(
      -this.canvas.width * 0.5,
      -this.canvas.height * 0.5
    );

    this._viewMatrix.setMaxScreenRect(-2.0, 2.0, -2.0, 2.0);
    CubismFramework.startUp(this._cubismOptions);
    CubismFramework.initialize();
    this.initializeSprite();
  }

  private createShader(): WebGLProgram | undefined {
    if (!this.gl) {
      return undefined;
    }
    const vertexShaderId = this.gl.createShader(this.gl.VERTEX_SHADER);
    if (!vertexShaderId) {
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
    if (!fragmentShaderId) {
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
    if (!programId) {
      console.log("program id is null");
      return undefined;
    }
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

  public releaseAllModel(): void {
    const keys = Object.keys(this._models);
    for (const i of keys) {
      this._models[i].releaseTextures();
      this._models[i].releaseExpressions();
      this._models[i].releaseMotions();
      this._models[i].release();
    }
  }

  public release(): void {
    this.releaseAllModel();

    this.gl.deleteProgram(this._programId);
    this._viewMatrix = null;
    this._deviceToScreen = null;

    CubismFramework.dispose();
  }

  public runAllModel(): void {
    const loop = () => {
      if (!this.gl) {
        return;
      }

      LAppPal.updateTime();

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
      const modelKeys = Object.keys(this._models);
      for (const i of modelKeys) {
        const projection = new CubismMatrix44();
        const model = this._models[i];
        if (!model.isCompleteSetup) {
          break;
        }
        if (model.getModel()) {
          if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
            model.getModelMatrix().setWidth(2.0);
            projection.scale(1.0, width / height);
          } else {
            projection.scale(height / width, 1.0);
          }

          projection.multiplyByMatrix(this._viewMatrix);

          model.update();
          model.draw(projection, width, height, this.frameBuffer);
        }
      }
      requestAnimationFrame(loop);
    };

    loop();
  }
  
  public runSingleModel(): void {
    const loop = () => {
      if (!this.gl) {
        return;
      }

      LAppPal.updateTime();

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
      const modelKeys = Object.keys(this._models);
      if (modelKeys.length < 1 || this._models[this.targetCurrentModelKey] != undefined) {
        return;
      }

      const projection = new CubismMatrix44();

      const model = this._models[this.targetCurrentModelKey];
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
        model.draw(projection, width, height, this.frameBuffer);
      }
    };
    
    if (model != undefined && model.isCompleteSetup) {
      draw();
    }
    

      requestAnimationFrame(loop);
    };

    loop();
  }
}
