/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import {
  CubismFramework,
} from "../CubismSdkForWeb/src/live2dcubismframework";
import { csmVector } from "../CubismSdkForWeb/src/type/csmvector";
import { csmString } from "../CubismSdkForWeb/src/type/csmstring";
import { CubismUserModel } from "../CubismSdkForWeb/src/model/cubismusermodel";
import {
  BreathParameterData,
  CubismBreath,
} from "../CubismSdkForWeb/src/effect/cubismbreath";
import { CubismIdHandle } from "../CubismSdkForWeb/src/id/cubismid";
import { CubismDefaultParameterId } from "../CubismSdkForWeb/src/cubismdefaultparameterid";
import { csmMap, csmPair } from "../CubismSdkForWeb/src/type/csmmap";
import { ACubismMotion } from "../CubismSdkForWeb/src/motion/acubismmotion";
import { csmRect } from "../CubismSdkForWeb/src/type/csmrectf";
import { CubismEyeBlink } from "../CubismSdkForWeb/src/effect/cubismeyeblink";
import { CubismMatrix44 } from "../CubismSdkForWeb/src/math/cubismmatrix44";
import { CubismMotionSync } from "../CubismWebMotionSyncComponents/Framework/src/live2dcubismmotionsync";
import { CubismModelMotionSyncSettingJson } from "../CubismWebMotionSyncComponents/Framework/src/cubismmodelmotionsyncsettingjson";
import { LAppPal } from "./lapppal";
import { LAppWavFileHandler } from "./lappwavfilehandler";
import { LAppAudioManager } from "./lappaudiomanager";
import * as LAppMotionSyncDefine from "./lappmotionsyncdefine";
import * as LAppDefine from "./lappdefine";
import { Live2dViewer } from "./live2dViewer";

class TextureInfo {
  public imageUrl: string;
  public img: HTMLImageElement;
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

export class Live2dMotionSyncModel extends CubismUserModel {
  _live2dViewer: Live2dViewer;
  _modelSetting: CubismModelMotionSyncSettingJson | null;
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

  private manualClosedEye: boolean;
  
  _soundFileList: csmVector<csmString>;
  _soundIndex: number;
  _soundData: LAppAudioManager;
  _motionSync: CubismMotionSync;
  _lastSampleCount: number;
  _isStartMotinoSync: boolean;

  public async startLipSync(bytes: ArrayBuffer): Promise<void> {
    await this._wavFileHandler.startWithBytes(bytes);
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

  public closeEyelids(): void {
    this.manualClosedEye = true;
  }
  
  public openEyelids(): void {
    this.manualClosedEye = false;
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
      if (this.manualClosedEye) {
        this._model.setParameterValueById(this._idParamEyeLOpen, -0.5);
        this._model.setParameterValueById(this._idParamEyeROpen, -0.5);
      }

      if (!this.manualClosedEye) {
        this._eyeBlink.updateParameters(this._model, deltaTimeSeconds);
      }
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
    if (this._lipsync && !this._isStartMotinoSync) {
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
    
    if (this._isStartMotinoSync) {
      this.updateMotionSync();
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
      textureInfo.img = img;
      textureInfo.width = img.width;
      textureInfo.height = img.height;
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
        // console.log(`textureCount: ${this._textureCount}, argument textureCount: ${textureCount}, fileName: ${fileName}`);
        this.isCompleteSetup = true;
      }
    };
    img.src = url;
  }

  private async loadTextures(): Promise<void> {
    if (!this._modelSetting || this.isCompleteSetup) {
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
  private async setupModel(setting: CubismModelMotionSyncSettingJson): Promise<void> {
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
      const expressionName = this._modelSetting.getExpressionName(i);
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
      this.loadPhysics(readResult, readResult.byteLength);
    }
    
    // Load Pose
    const poseFileName = this._modelSetting.getPoseFileName();
    if (poseFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${poseFileName}`
      );
      this.loadPose(readResult, readResult.byteLength);
    }

    // Set Eye Blink params
    if (this._modelSetting.getEyeBlinkParameterCount() > 0) {
      this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
    }
    for (let i = 0; i < this._modelSetting.getEyeBlinkParameterCount(); ++i) {
      this._eyeBlinkIds.pushBack(this._modelSetting.getEyeBlinkParameterId(i));
    }

    // Breath
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

    // set lipsync id
    const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();
    for (let i = 0; i < lipSyncIdCount; ++i) {
      this._lipSyncIds.pushBack(this._modelSetting.getLipSyncParameterId(i));
    }

    if (!this._modelMatrix) {
      console.log("modelMatrix is null");
      return;
    }
    // Layout
    const layout = new csmMap<string, number>();
    this._modelSetting.getLayoutMap(layout);
    this._modelMatrix.setupFromLayout(layout);
    
    const motionSyncFileName = this._modelSetting.getMotionSyncFileName();
    if (motionSyncFileName != undefined || motionSyncFileName !== "NullValue") {
      const data = await this.readFileFunction(`${this._modelHomeDir}${motionSyncFileName}`);
      this.loadMotionSync(data, data.byteLength);
      this._soundFileList = this._modelSetting.getMotionSyncSoundFileList();
      this._soundIndex = 0;
    }
    
    this.createRenderer();
    this.getRenderer().setIsPremultipliedAlpha(true);
    await this.loadTextures();
    if (this._live2dViewer.gl) {
      this.getRenderer().startUp(this._live2dViewer.gl);
    }

    // this._model.saveParameters();
    /*
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
    */
  }

  public async loadAssets(): Promise<void> {
    const filePath = `${this._modelHomeDir}${this._modelJsonFileName}`;
    const readResult = await this.readFileFunction(filePath);
    const setting = new CubismModelMotionSyncSettingJson(
      readResult,
      readResult.byteLength
    );
    await this.setupModel(setting);
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
  /*
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
  */

  public setLipSyncWeight(weight: number): void {
    this.lipSyncWeight = weight;
  }

  /**
   * モーションデータをグループ名から一括でロードする。
   * モーションデータの名前は内部でModelSettingから取得する。
   *
   * @param group モーションデータのグループ名
   */
  /*
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
  */
  
  /**
   * 引数で指定した表情モーションをセットする
   *
   * @param expressionId 表情モーションのID
   */
  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this._expressions.getValue(expressionId);
  
    if (this._debugMode) {
      LAppPal.printMessage(`expression: [${expressionId}]`);
    }
  
    if (motion != undefined) {
      this._expressionManager.startMotionPriority(
        motion,
        false,
        LAppDefine.PriorityForce
      );
    } else {
      if (this._debugMode) {
        LAppPal.printMessage(`expression[${expressionId}] is null`);
      }
    }
  }
  
  public resetExpression(): void {
    this._expressionManager.stopAllMotions();
  }
  
  public getExpressionIdList(): string[] {
    const result: string[] = [];
    const keys: csmPair<string, ACubismMotion>[] = this._expressions._keyValues;
    for (const i of keys) {
      // It's a workaround. prepend missing property when after build.
      if (i != undefined && i.first != undefined) {
        const expressionId = i.first;
        result.push(expressionId);
      }
    }
    
    return result;
  }
  
/**
 * モーションシンクデータの読み込み
 * @param buffer  physics3.jsonが読み込まれているバッファ
 * @param size    バッファのサイズ
 */
  private loadMotionSync(buffer: ArrayBuffer, size: number) {
    if (buffer == null || size == 0) {
      // CubismLogError('Failed to loadMotionSync().');
      return;
    }

    this._motionSync = CubismMotionSync.create(
      this._model,
      buffer,
      size,
      LAppMotionSyncDefine.SamplesPerSec
    );
  }  
  
  /**
   * 音声ファイルリストから読み込みを行う。
   */
  public loadFromSoundList(): void {
    if (!this._soundFileList || !this._soundData) {
      return;
    }

    this._soundData
      .getSoundBufferContext()
      .getAudioManager()
      ._audios.resize(this._soundFileList.getSize());
    this._soundData
      .getSoundBufferContext()
      .getBuffers()
      .resize(this._soundFileList.getSize());

    for (let index = 0; index < this._soundFileList.getSize(); index++) {
      const filePath = this._modelHomeDir + this._soundFileList.at(index).s;
      this._soundData.loadFile(filePath, index, this, this._motionSync);
    }
  }

  /**
   * 現在の音声のコンテキストが待機状態かどうかを判定する
   *
   * @returns 現在の音声のコンテキストが待機状態か？
   */
  public isSuspendedCurrentSoundContext(): boolean {
    return this._soundData.isSuspendedContextByIndex(this._soundIndex);
  }

  /**
   * 現在の音声を再生する
   */
  public playCurrentSound(): void {
    if (
      !this._soundData ||
      !this._soundFileList ||
      !(this._soundIndex < this._soundFileList.getSize()) ||
      !this._motionSync
    ) {
      return;
    }

    this._motionSync.setSoundBuffer(
      0,
      this._soundData.getSoundBufferContext().getBuffers().at(this._soundIndex),
      0
    );

    this._soundData.playByIndex(this._soundIndex);
  }
  
  public async startMotionSync(bytes: Uint8Array): Promise<void> {
    if(!this._motionSync) return;
    
    const audioMnager = this._soundData.getSoundBufferContext().getAudioManager();
    await audioMnager.createAudioFromBytes(bytes, 0);
    
    const buffer = this._soundData.getSoundBufferContext().getBufferForSinglePlay();
    this._motionSync.setSoundBuffer(0, buffer, 0);
    this._isStartMotinoSync = true;
  }

  /**
   * 現在の音声を再生停止する
   */
  public stopCurrentSound(): void {
    if (
      !this._soundData ||
      !this._soundFileList ||
      !(this._soundIndex < this._soundFileList.getSize())
    ) {
      return;
    }

    this._soundData.stopByIndex(this._soundIndex);
  }
  
  public stopMotionSync(): void {
    if (this._soundData != null) return;
    this._isStartMotinoSync = false;
    this._soundData.stopForSinglePlay();
  }
  
/**
   * モーションシンクの更新
   */
public updateMotionSync() {
  const soundBuffer = this._soundData
    .getSoundBufferContext()
    .getBuffers()
    .at(this._soundIndex);
  const audioInfo = this._soundData
    .getSoundBufferContext()
    .getAudioManager()
    ._audios.at(this._soundIndex);

  // 現在フレームの時間を秒単位で取得
  // NOTE: ブラウザやブラウザ側の設定により、performance.now() の精度が異なる可能性に注意
  const currentAudioTime = performance.now() / 1000.0; // convert to seconds.

  // 再生時間の更新
  // 前回フレームの時間が現在時刻よりも前だった場合は同時刻として扱う。
  if (currentAudioTime < audioInfo.audioContextPreviousTime) {
    audioInfo.audioContextPreviousTime = currentAudioTime;
  }

  // 前回フレームの時間から経過時間を計算
  const audioDeltaTime =
    currentAudioTime - audioInfo.audioContextPreviousTime;

  // 経過時間を更新
  audioInfo.audioElapsedTime += audioDeltaTime;

  // 再生時間をサンプル数に変換する。
  // サンプル数 = 再生時間 * サンプリングレート
  // NOTE: サンプリングレートは、音声ファイルに設定された値を使用する。音声コンテキストのサンプリングレートを使用すると、正しくモーションシンクが再生されない場合がある。
  const currentSamplePosition = Math.floor(
    audioInfo.audioElapsedTime * audioInfo.wavhandler.getWavSamplingRate()
  );

  // 処理済みの再生位置が音声のサンプル数を超えていたら、処理を行わない。
  if (audioInfo.previousSamplePosition <= audioInfo.audioSamples.length) {
    // 前回の再生位置を起点に、音声サンプルを再生済みの数だけ取得する。
    const currentAudioSamples = audioInfo.audioSamples.slice(
      audioInfo.previousSamplePosition,
      currentSamplePosition
    );

    // サウンドバッファに再生済みのサンプルを追加する。
    for (let index = 0; index < currentAudioSamples.length; index++) {
      soundBuffer.pushBack(currentAudioSamples[index]);
    }

    // サウンドバッファの設定
    this._motionSync.setSoundBuffer(0, soundBuffer, 0);

    // モーションシンクの更新
    this._motionSync.updateParameters(this._model, audioDeltaTime);

    // 解析しただけデータを削除する。
    const lastTotalProcessedCount =
      this._motionSync.getLastTotalProcessedCount(0);
    this._soundData.removeDataArrayByIndex(
      this._soundIndex,
      lastTotalProcessedCount
    );

    // 再生済みのサンプル数と再生時間を現在のものへ更新する。
    audioInfo.audioContextPreviousTime = currentAudioTime;
    audioInfo.previousSamplePosition = currentSamplePosition;
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
    readFileFunction: (arg: string) => Promise<ArrayBuffer>,
    is_old_param_name?: boolean,
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
      this._idParamEyeLOpen = CubismFramework.getIdManager().getId("PARAM_EYE_L_OPEN");
      this._idParamEyeROpen = CubismFramework.getIdManager().getId("PARAM_EYE_R_OPEN");
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
      
      this._idParamEyeLOpen = CubismFramework.getIdManager().getId("ParamEyeLOpen");
      this._idParamEyeROpen = CubismFramework.getIdManager().getId("ParamEyeROpen");
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
    this.manualClosedEye = false;

    this._soundFileList = new csmVector<csmString>;
    this._soundIndex = 0;
    this._soundData = new LAppAudioManager();
    this._lastSampleCount = 0;
    this._isStartMotinoSync = false;

  }
}
