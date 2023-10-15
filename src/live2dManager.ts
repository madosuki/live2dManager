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
import {
  csmVector,
  iterator,
} from "../CubismWebFramework/src/type/csmvector";
import { CubismUserModel } from "../CubismWebFramework/src/model/cubismusermodel";
import { ICubismModelSetting } from "../CubismWebFramework/src/icubismmodelsetting";
import { BreathParameterData, CubismBreath } from "../CubismWebFramework/src/effect/cubismbreath";
import { CubismIdHandle } from "../CubismWebFramework/src/id/cubismid";
import { CubismDefaultParameterId } from "../CubismWebFramework/src/cubismdefaultparameterid";
import { CubismModelSettingJson } from "../CubismWebFramework/src/cubismmodelsettingjson";
import { csmMap } from "../CubismWebFramework/src/type/csmmap";
import { ACubismMotion } from "../CubismWebFramework/src/motion/acubismmotion";
import { csmRect } from "../CubismWebFramework/src/type/csmrectf";
import { csmString } from "../CubismWebFramework/src/type/csmstring";
import { CubismEyeBlink } from "../CubismWebFramework/src/effect/cubismeyeblink";
import { CubismMoc } from "../CubismWebFramework/src/model/cubismmoc";
import {
  CubismLogError,
  CubismLogInfo,
} from "../CubismWebFramework/src/utils/cubismdebug";
import { CubismRenderer_WebGL } from "../CubismWebFramework/src/rendering/cubismrenderer_webgl";
import { CubismPhysics } from "../CubismWebFramework/src/physics/cubismphysics";
import { CubismMatrix44 } from "../CubismWebFramework/src/math/cubismmatrix44";
import { CubismViewMatrix } from "../CubismWebFramework/src/math/cubismviewmatrix";
import { TouchManager } from "./touchmanager";
import { LAppPal } from "./lapppal";
import { LAppWavFileHandler } from "./lappwavfilehandler";

function outLog(message: string): void {
    console.log(`log message: ${message}`);
}

function updateTime(): void {
  currentFrame = Date.now();
  deltaTime = (currentFrame - lastFrame) / 1000;
  lastFrame = currentFrame;
}

class TextureInfo {
  public imageUrl: string;
  public id: WebGLTexture | undefined;
  public width: number;
  public height: number;
  public usePremulitply: boolean;
  public fileName: string;

  constructor() {
    this.imageUrl = "";
    this.id = undefined;
    this.width = 0;
    this.height = 0;
    this.usePremulitply = false;
    this.fileName = "";
  }
}

let currentFrame = 0.0;
let lastFrame = 0.0;
let deltaTime = 0.0;

export class Live2dModel extends CubismUserModel {
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

  _state: number;
  _expressionCount: number;
  _textureCount: number;
  _motionCount: number;
  _allMotionCount: number;

  _textures: csmVector<TextureInfo>;
  isCompleteSetup: boolean;
  readFileFunction: (arg: string) => Promise<ArrayBuffer>;
  _wavFileHandler: LAppWavFileHandler;

  public startLipSync(bytes: ArrayBuffer): void {
      this._wavFileHandler.startWithBytes(bytes);
      console.log("startLipSync");
  }

  public update(): void {
    const deltaTimeSeconds = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();

    this._model.loadParameters();
    this._model.saveParameters();

    this._eyeBlink.updateParameters(this._model, deltaTimeSeconds);

    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30);
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30
    );

    this._model.addParameterValueById(this._idParamBodyAngleX, this._dragX * 10);

    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX);
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    if (this._breath) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    if (this._physics) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    if (this._lipsync) {
      let value = 0.0;
      this._wavFileHandler.update(deltaTimeSeconds);
      value = this._wavFileHandler.getRms();

      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
          if (value <= 0.0) break;
          console.log(this._lipSyncIds.at(i));
          this._model.addParameterValueById(this._lipSyncIds.at(i), value, 5.0);
      }
    }

    this._model.update();
  }

  private async createTextureFromFile(
    fileName: string,
    usePremultiply: boolean,
    index: number,
    textureCount: number
  ): Promise<void> {
    console.log(`${fileName} in createTextureFromFile`);
    const readResult = await this.readFileFunction(fileName);
    console.log(`${fileName} bytes: ${readResult.byteLength}`);

    const img = new Image();
    const byteArray = new Uint8ClampedArray(readResult);
    const url = URL.createObjectURL(
      new Blob([byteArray.buffer], { type: "image/png" })
    );
    img.onload = (): void => {
      if (!this._live2dViewer.gl) {
        return;
      }
      const _texture = this._live2dViewer.gl.createTexture();
      if (!_texture) {
        return;
      }
      this._live2dViewer.gl.bindTexture(
        this._live2dViewer.gl.TEXTURE_2D,
        _texture
      );

      this._live2dViewer.gl.texParameteri(
        this._live2dViewer.gl.TEXTURE_2D,
        this._live2dViewer.gl.TEXTURE_MIN_FILTER,
        this._live2dViewer.gl.LINEAR_MIPMAP_LINEAR
      );

      if (usePremultiply) {
        this._live2dViewer.gl.pixelStorei(
          this._live2dViewer.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
          1
        );
      }

      this._live2dViewer.gl.texImage2D(
        this._live2dViewer.gl.TEXTURE_2D,
        0,
        this._live2dViewer.gl.RGBA,
        this._live2dViewer.gl.RGBA,
        this._live2dViewer.gl.UNSIGNED_BYTE,
        img
      );

      this._live2dViewer.gl.generateMipmap(this._live2dViewer.gl.TEXTURE_2D);
      this._live2dViewer.gl.bindTexture(this._live2dViewer.gl.TEXTURE_2D, null);

      const textureInfo = new TextureInfo();
      textureInfo.fileName = fileName;
      textureInfo.imageUrl = url;
      textureInfo.id = _texture;
      textureInfo.usePremulitply = usePremultiply;
      this._textures.pushBack(textureInfo);

      const id = textureInfo.id;
      if (!id) {
        return;
      }
      this.getRenderer().bindTexture(index, id);
      this._textureCount++;

      if (this._textureCount >= textureCount) {
        this.isCompleteSetup = true;
      }
    };
    img.src = url;
  }

  private async loadTextures(): Promise<void> {
    if (!this._modelSetting) {
      return;
    }

    const usePremultiply = true;

    const textCureCount = this._modelSetting.getTextureCount();

    for (let i = 0; i < textCureCount; ++i) {
      const textureFileName = this._modelSetting.getTextureFileName(i);
      if (textureFileName == "") {
        continue;
      }
      const texturePath = `${this._modelHomeDir}${textureFileName}`;

      await this.createTextureFromFile(
        texturePath,
        usePremultiply,
        i,
        textCureCount
      );
      this.getRenderer().setIsPremultipliedAlpha(usePremultiply);
    }
  }

  private async setupModel(setting: ICubismModelSetting): Promise<void> {
    this._modelSetting = setting;
    const modelFileName = setting.getModelFileName();
    console.log(`model fileName: ${modelFileName}`);

    if (modelFileName === "") {
      return;
    }

    const filePath = `${this._modelHomeDir}${modelFileName}`;
    console.log(`model file path: ${filePath}`);
    try {
      const bytesResult = await this.readFileFunction(filePath);

      console.log(`bytes length: ${bytesResult.byteLength}`);
      this.loadModel(bytesResult, this._mocConsistency);
    } catch {
      return;
    }

    if (!this._moc) {
      console.log("failed CubismMOc.create()");
      return;
    }

    if (!this._model) {
      console.log("failed create model");
      return;
    }

    if (this._modelSetting.getPhysicsFileName() !== "") {
      const physicsFileName = this._modelSetting.getPhysicsFileName();
      console.log(`physics filename: ${physicsFileName}`);

      try {
      const readResult = await this.readFileFunction(`${this._modelHomeDir}${physicsFileName}`);
      this.loadPhysics(readResult, readResult.byteLength);
      } catch {
          console.log("failed load physics");
      }
    }

    if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
      this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
    }
    for (let i = 0; i < this._modelSetting.getEyeBlinkParameterCount(); ++i) {
      this._eyeBlinkIds.pushBack(this._modelSetting.getEyeBlinkParameterId(i));
    }

    this._breath = CubismBreath.create();
    const breathParameters: csmVector<BreathParameterData> = new csmVector();
    breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5)
    );

    breathParameters.pushBack(
      new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5)
    );
    breathParameters.pushBack(
      new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5)
    );
    breathParameters.pushBack(
      new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5)
    );
    breathParameters.pushBack(
      new BreathParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamBreath
        ),
        0.5,
        0.5,
        3.2345,
        1
      )
    );
    this._breath.setParameters(breathParameters);

    const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();
    for (let i = 0; i < lipSyncIdCount; ++i) {
      this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i));
    }
    console.log(`lip sync ids count: ${lipSyncIdCount}`);

    if (!this._modelMatrix) {
      console.log("modelMatrix is null");
      return;
    }
    const layout = new csmMap<string, number>();
    this._modelSetting.getLayoutMap(layout);
    this._modelMatrix.setupFromLayout(layout);

    console.log(
      `model canvas width: ${this._model.getCanvasWidth()}`
    );

    this.createRenderer();
    await this.loadTextures();
    if (this._live2dViewer.gl) {
      this.getRenderer().setIsPremultipliedAlpha(true);
      this.getRenderer().startUp(this._live2dViewer.gl);
    }
  }

  public async loadAssets(): Promise<void> {
    const filePath = `${this._modelHomeDir}${this._modelJsonFileName}`;
    try {
      const readResult = await this.readFileFunction(filePath);
      const setting = new CubismModelSettingJson(readResult, readResult.byteLength);
      await this.setupModel(setting);
    } catch {
        console.log("failed load assets");
    }
  }

  public draw(
    matrix: CubismMatrix44,
    canvasWidth: number,
    canvasHeight: number,
    frameBuffer: WebGLFramebuffer | null
  ): void {
    matrix.multiplyByMatrix(this._modelMatrix);
    this.getRenderer().setMvpMatrix(matrix);

    const viewPort = [0, 0, canvasWidth, canvasHeight];
    this.getRenderer().setRenderState(
      frameBuffer as WebGLFramebuffer,
      viewPort
    );
    this.getRenderer().drawModel();
  }

  public constructor(
    modelHomeDir: string,
    modelJsonFileName: string,
    live2dViewer: Live2dViewer,
    is_old_param_name: boolean,
    readFileFunction: (arg: string) => Promise<ArrayBuffer>
  ) {
    super();
    this._modelSetting = null;
    this._modelHomeDir = modelHomeDir;
    this._modelJsonFileName = modelJsonFileName;
    this._userTimeSeconds = 0.0;

    this._eyeBlinkIds = new csmVector<CubismIdHandle>();
    this._lipSyncIds = new csmVector<CubismIdHandle>();

    this._motions = new csmMap<string, ACubismMotion>();
    this._expressions = new csmMap<string, ACubismMotion>();

    this._hitArea = new csmVector<csmRect>();
    this._userArea = new csmVector<csmRect>();

    if (is_old_param_name) {
      this._idParamAngleX =
        CubismFramework.getIdManager().getId("PARAM_ANGLE_X");
      this._idParamAngleY =
        CubismFramework.getIdManager().getId("PARAM_ANGLE_Y");
      this._idParamAngleZ =
        CubismFramework.getIdManager().getId("PARAM_ANGLE_Z");

      this._idParamEyeBallX =
        CubismFramework.getIdManager().getId("PARAM_EYE_BALL_X");
      this._idParamEyeBallY =
        CubismFramework.getIdManager().getId("PARAM_EYE_BALL_Y");
      this._idParamBodyAngleX =
        CubismFramework.getIdManager().getId("PARAM_BODY_ANGLE_X");
    } else {
      this._idParamAngleX = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamAngleX
      );
      this._idParamAngleY = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamAngleY
      );
      this._idParamAngleZ = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamAngleZ
      );

      this._idParamEyeBallX = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamEyeBallX
      );
      this._idParamEyeBallY = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamEyeBallY
      );

      this._idParamBodyAngleX = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamBodyAngleX
      );
    }

    this._mocConsistency = true;
    this._allMotionCount = 0;
    this._motionCount = 0;
    this._textureCount = 0;
    this._expressionCount = 0;
    this._state = 0;

    this._textures = new csmVector<TextureInfo>();
    this._live2dViewer = live2dViewer;

    this.isCompleteSetup = false;
    this.readFileFunction = readFileFunction;
    this._wavFileHandler = new LAppWavFileHandler();
  }
}

export class Live2dViewer {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext | null;
  frameBuffer: WebGLFramebuffer | null;
  _models: csmVector<Live2dModel>;
  _programId: WebGLProgram | undefined;
  _viewMatrix: CubismViewMatrix;
  _cubismOptions: Option;
  isSetupComplete: boolean;
  isDown: boolean;
  _deviceToScreen: CubismMatrix44;
  _touchManager: TouchManager;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = 800;
    this.canvas.height = 800;
    this.gl = null;
    this.frameBuffer = null;
    this._models = new csmVector<Live2dModel>();

    this._viewMatrix = new CubismViewMatrix();
    this._cubismOptions = new Option();
    this._deviceToScreen = new CubismMatrix44();
    this.isSetupComplete = false;
    this.isDown = false;

    this._touchManager = new TouchManager();
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
    console.log("end");
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

  public addModel(model: Live2dModel): void {
    this._models.pushBack(model);
  }

  public updateCoordinate(x: number, y: number): void {
    const model = this._models.at(0);
    console.log(`${x}, ${y}`);
    model.setDragging(x, y);
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
      return;
    }
    console.log(this.gl.getError());

    this.frameBuffer = this.gl.getParameter(this.gl.FRAMEBUFFER_BINDING);
    if (!this.frameBuffer) {
      console.log("framebuffer is null");
      console.log(this.gl.getError());
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

  public run(): void {
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
      const modelCount = this._models.getSize();
      for (let i = 0; i < modelCount; ++i) {
        const projection = new CubismMatrix44();
        const model = this._models.at(i);
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
          // console.log("run");

          // console.log("draw model");
          model.update();
          model.draw(projection, width, height, this.frameBuffer);
        }
      }
      requestAnimationFrame(loop);
    };

    loop();
  }
}

