/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import {
  CubismFramework,
} from "../CubismWebFramework/src/live2dcubismframework";
import { csmVector } from "../CubismWebFramework/src/type/csmvector";
import { CubismUserModel } from "../CubismWebFramework/src/model/cubismusermodel";
import { ICubismModelSetting } from "../CubismWebFramework/src/icubismmodelsetting";
import {
  BreathParameterData,
  CubismBreath,
} from "../CubismWebFramework/src/effect/cubismbreath";
import { CubismIdHandle } from "../CubismWebFramework/src/id/cubismid";
import { CubismDefaultParameterId } from "../CubismWebFramework/src/cubismdefaultparameterid";
import { CubismModelSettingJson } from "../CubismWebFramework/src/cubismmodelsettingjson";
import { csmMap } from "../CubismWebFramework/src/type/csmmap";
import { ACubismMotion, FinishedMotionCallback } from "../CubismWebFramework/src/motion/acubismmotion";
import { csmRect } from "../CubismWebFramework/src/type/csmrectf";
import { CubismEyeBlink } from "../CubismWebFramework/src/effect/cubismeyeblink";
import { CubismMatrix44 } from "../CubismWebFramework/src/math/cubismmatrix44";
import { CubismMotion } from "../CubismWebFramework/src/motion/cubismmotion";
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue
} from "../CubismWebFramework/src/motion/cubismmotionqueuemanager";
import { LAppPal } from "./lapppal";
import { LAppWavFileHandler } from "./lappwavfilehandler";
import * as LAppDefine from "./lappdefine";
import { Live2dViewer } from "./live2dViewer";

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
  lipSyncWeight: number;

  public startLipSync(bytes: ArrayBuffer): void {
    this._wavFileHandler.startWithBytes(bytes);
  }

  public stopLipSync(): void {
    this._wavFileHandler.releasePcmData();
  }

  public releaseTextures(): void {
    if (this._textures == undefined || this._textures.getSize() === 0) {
      return;
    }

    for (let i = 0; i < this._textures.getSize(); i++) {
      this._textures.set(i, null);
    }
    this._textures.clear();
  }
  
  public releaseTextureByTexture(texture: WebGLTexture): void {
    for (let i =  0; i < this._textures.getSize(); i++) {
      if (this._textures.at(i).id != texture) {
        continue;
      }
      
      this._textures.set(i, null);
      this._textures.remove(i);
    }
  }

  public releaseMotions(): void {
    if (this._motions != undefined && this._motions.getSize() > 0) {
      this._motions.clear();
    }
  }

  public releaseExpressions(): void {
    if (this._expressions != undefined && this._motions.getSize() > 0) {
      this._expressions.clear();
    }
  }

  public update(): void {
    const deltaTimeSeconds = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();

    // モーションによるパラメーター更新の有無
    let isMotionUpdated = false;
    
    // 前回セーブされたをロード
    this._model.loadParameters();
    // モーションを更新
    if (!this._motionManager.isFinished()) {
      isMotionUpdated = this._motionManager.updateMotion(this._model, deltaTimeSeconds);
    }
    // 状態を保存
    this._model.saveParameters();

    // まばたき
    if (!isMotionUpdated && this._eyeBlink != undefined) {
      this._eyeBlink.updateParameters(this._model, deltaTimeSeconds);
    }
    
    // 表情
    if (this._expressionManager != undefined) {
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds);
    }

    // ドラッグによる顔の向きの調整
    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30);
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30
    ); // -30から30の値を加える

    // ドラッグによる体の向きの調整
    this._model.addParameterValueById(
      this._idParamBodyAngleX,
      this._dragX * 10
    ); // -10から10の値を加える

    // ドラッグによる目の向きの調整
    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX);
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    // 呼吸など
    if (this._breath != undefined) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    // 物理演算の設定
    if (this._physics != undefined) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    // リップシンクの設定
    if (this._lipsync) {
      let value = 0.0;
      this._wavFileHandler.update(deltaTimeSeconds);
      value = this._wavFileHandler.getRms();

      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
        if (value <= 0.0) break;
        this._model.addParameterValueById(this._lipSyncIds.at(i), value, this.lipSyncWeight);
      }
    }
    
    // ポーズの設定
    if (this._pose != undefined) {
      this._pose.updateParameters(this._model, deltaTimeSeconds);
    }

    this._model.update();
  }
  
  private async createTextureFromFile(
    fileName: string,
    usePremultiply: boolean,
    index: number,
    textureCount: number
  ): Promise<void> {
    const readResult = await this.readFileFunction(fileName);

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
        console.log(`textureCount: ${this._textureCount}, argument textureCount: ${textureCount}, fileName: ${fileName}`);
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

    const textureCount = this._modelSetting.getTextureCount();

    for (let i = 0; i < textureCount; ++i) {
      const textureFileName = this._modelSetting.getTextureFileName(i);
      if (textureFileName == "") {
        continue;
      }
      const texturePath = `${this._modelHomeDir}${textureFileName}`;
      
      await this.createTextureFromFile(
        texturePath,
        usePremultiply,
        i,
        textureCount
      );
      this.getRenderer().setIsPremultipliedAlpha(usePremultiply);
    }
  }

 /**
  * model3.jsonからモデルを生成する。
  * model3.jsonの記述に従ってモデル生成、モーション、物理演算などのコンポーネント生成を行う。
  *
  * @param setting ICubismModelSettingのインスタンス
  */
  private async setupModel(setting: ICubismModelSetting, isPreloadMotion: boolean): Promise<void> {
    this._modelSetting = setting;
    const modelFileName = setting.getModelFileName();

    if (modelFileName === "") {
      return;
    }

    const filePath = `${this._modelHomeDir}${modelFileName}`;
    try {
      const bytesResult = await this.readFileFunction(filePath);
      this.loadModel(bytesResult, this._mocConsistency);
    } catch(e) {
      console.log(e)
      return;
    }

    if (!this._moc) {
      throw new Error("failed CubismMOc.create()");
    }

    if (!this._model) {
      throw new Error("failed create model");
    }
    
    // Load Expression
    const expressionCount = this._modelSetting.getExpressionCount();
    for (let i = 0; i < expressionCount; i++) {
      const expressionName = this._modelSetting.getExpressionFileName(i);
      const expressionFileName = this._modelSetting.getExpressionFileName(i);
      
      const readResult = await this.readFileFunction(`${this._modelHomeDir}${expressionFileName}`);
      const motion = this.loadExpression(readResult, readResult.byteLength, expressionName);
      
      if (this._expressions.getValue(expressionName) != null) {
        ACubismMotion.delete(this._expressions.getValue(expressionName));
        this._expressions.setValue(expressionName, null);
      }
      
      this._expressions.setValue(expressionName, motion);
      this._expressionCount++;
    }

    // Load Physics
    const physicsFileName = this._modelSetting.getPhysicsFileName();
    if (physicsFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${physicsFileName}`
      );
      console.log(physicsFileName);
      this.loadPhysics(readResult, readResult.byteLength);
    }
    
    // Load Pose
    const poseFileName = this._modelSetting.getPoseFileName();
    if (poseFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${physicsFileName}`
      );
      console.log(poseFileName);
      this.loadPose(readResult, readResult.byteLength);
    }

    // Set Eye Blink params
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
    
    const userDataFileName = this._modelSetting.getUserDataFile();
    if (userDataFileName !== "") {
      const readResult = await this.readFileFunction(`${this._modelHomeDir}${userDataFileName}`);
      this.loadUserData(readResult, readResult.byteLength);
    }

    const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();
    for (let i = 0; i < lipSyncIdCount; ++i) {
      this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i));
    }

    if (!this._modelMatrix) {
      console.log("modelMatrix is null");
      return;
    }
    const layout = new csmMap<string, number>();
    this._modelSetting.getLayoutMap(layout);
    this._modelMatrix.setupFromLayout(layout);
    
    this._model.saveParameters();
    this._allMotionCount = 0;
    this._motionCount = 0;
    const motionGroupCount: number = this._modelSetting.getMotionGroupCount();
    for (let i = 0; i < motionGroupCount; i++) {
      const groupName = this._modelSetting.getMotionGroupName(i);
      this._allMotionCount += this._modelSetting.getMotionCount(groupName);

      if (isPreloadMotion) {
        await this.preLoadMotionGroup(groupName);
      }
    }

    if (motionGroupCount === 0 || !isPreloadMotion) {
      this._motionManager.stopAllMotions();

      this.createRenderer();
      this.getRenderer().setIsPremultipliedAlpha(true);
      await this.loadTextures();
      if (this._live2dViewer.gl) {
        this.getRenderer().startUp(this._live2dViewer.gl);
      }
    }
  }

  public async loadAssets(isPreloadMotion?: boolean): Promise<void> {
    const filePath = `${this._modelHomeDir}${this._modelJsonFileName}`;
    const readResult = await this.readFileFunction(filePath);
    const setting = new CubismModelSettingJson(
      readResult,
      readResult.byteLength
    );
    await this.setupModel(setting, isPreloadMotion);
  }

  public draw(
    matrix: CubismMatrix44,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    frameBuffer: WebGLFramebuffer | null
  ): void {
    matrix.multiplyByMatrix(this._modelMatrix);
    this.getRenderer().setMvpMatrix(matrix);

    const viewPort = [x, y, canvasWidth, canvasHeight];
    this.getRenderer().setRenderState(
      frameBuffer as WebGLFramebuffer,
      viewPort
    );
    this.getRenderer().drawModel();
  }
  
  /**
   * 引数で指定したモーションの再生を開始する
   * @param group モーショングループ名
   * @param no グループ内の番号
   * @param priority 優先度
   * @param onFinishedMotionHandler モーション再生終了時に呼び出されるコールバック関数
   * @return 開始したモーションの識別番号を返す。個別のモーションが終了したか否かを判定するisFinished()の引数で使用する。開始できない時は[-1]
   */
  public async startMotion(
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): Promise<CubismMotionQueueEntryHandle> {
    if (priority == LAppDefine.PriorityForce) {
      this._motionManager.setReservePriority(priority);
    } else if (!this._motionManager.reserveMotion(priority)) {
      if (this._debugMode) {
        LAppPal.printMessage("[APP]can't start motion.");
      }
      return InvalidMotionQueueEntryHandleValue;
    }

    const motionFileName = this._modelSetting.getMotionFileName(group, no);

    // ex) idle_0
    const name = `${group}_${no}`;
    let motion: CubismMotion = this._motions.getValue(name) as CubismMotion;
    let autoDelete = false;

    if (motion == null) {
      const path = `${this._modelHomeDir}${motionFileName}`;
      const bytes = await this.readFileFunction(path);
      motion = this.loadMotion(bytes, bytes.byteLength, null, onFinishedMotionHandler);
      let fadeTime: number = this._modelSetting.getMotionFadeInTimeValue(group, no);
      if (fadeTime >= 0.0) {
        motion.setFadeInTime(fadeTime);
      }

      fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, no);
      if (fadeTime >= 0.0) {
        motion.setFadeOutTime(fadeTime);
      }

      motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
      autoDelete = true; // 終了
    } else {
      motion.setFinishedMotionHandler(onFinishedMotionHandler);
    }

    //voice
    const voice = this._modelSetting.getMotionSoundFileName(group, no);
    if (voice.localeCompare('') != 0) {
      let path = voice;
      path = this._modelHomeDir + path;
      this._wavFileHandler.start(path);
    }

    if (this._debugMode) {
      LAppPal.printMessage(`[APP]start motion: [${group}_${no}`);
    }
    return this._motionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    );
  }

  public setLipSyncWeight(weight: number): void {
    this.lipSyncWeight = weight;
  }
  
  /**
   * モーションデータをグループ名から一括でロードする。
   * モーションデータの名前は内部でModelSettingから取得する。
   *
   * @param group モーションデータのグループ名
   */
  public async preLoadMotionGroup(group: string): Promise<void> {
    for (let i = 0; i < this._modelSetting.getMotionCount(group); i++) {
      const motionFileName = this._modelSetting.getMotionFileName(group, i);
  
        // ex) idle_0
      const name = `${group}_${i}`;
      if (this._debugMode) {
        LAppPal.printMessage(
          `[APP]load motion: ${motionFileName} => [${name}]`
        );
      }
  
      const motionFilePath = `${this._modelHomeDir}${motionFileName}`;
      const arrayBuffer = await this.readFileFunction(motionFilePath);

      const tmpMotion: CubismMotion = this.loadMotion(
        arrayBuffer,
        arrayBuffer.byteLength,
        name
      );
  
      if (tmpMotion != undefined) {
        let fadeTime = this._modelSetting.getMotionFadeInTimeValue(
          group,
          i
        );
        if (fadeTime >= 0.0) {
          tmpMotion.setFadeInTime(fadeTime);
        }
  
        fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, i);
        if (fadeTime >= 0.0) {
          tmpMotion.setFadeOutTime(fadeTime);
        }
        tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
  
        if (this._motions.getValue(name) != null) {
          ACubismMotion.delete(this._motions.getValue(name));
        }
  
        this._motions.setValue(name, tmpMotion);
  
        this._motionCount++;
        if (this._motionCount >= this._allMotionCount) {
  
          // 全てのモーションを停止する
          this._motionManager.stopAllMotions();
  
          this._updating = false;
          this._initialized = true;
  
          this.createRenderer();
          await this.loadTextures();
          if (this._live2dViewer.gl) {
            this.getRenderer().setIsPremultipliedAlpha(true);
            this.getRenderer().startUp(this._live2dViewer.gl);
          }
        }
      } else {
        // loadMotionできなかった場合はモーションの総数がずれるので1つ減らす
        this._allMotionCount--;
      }
    }
  }
  
  public reloadRenderer(): void {
    this.deleteRenderer();
    this.createRenderer();
    this.loadTextures();
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

    if (LAppDefine.MOCConsistencyValidationEnable) {
      this._mocConsistency = true;
    }

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
    this.lipSyncWeight = 0.8;
  }
}
