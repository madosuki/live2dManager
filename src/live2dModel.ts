/**
om a:messagel* Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

// Cubism Framework
import { CubismDefaultParameterId } from "@framework/cubismdefaultparameterid";
import { CubismModelSettingJson } from "@framework/cubismmodelsettingjson";
import {
  BreathParameterData,
  CubismBreath,
} from "@framework/effect/cubismbreath";
import { CubismEyeBlink } from "@framework/effect/cubismeyeblink";
import { ICubismModelSetting } from "@framework/icubismmodelsetting";
import { CubismIdHandle } from "@framework/id/cubismid";
import { CubismFramework } from "@framework/live2dcubismframework";
import { CubismMatrix44 } from "@framework/math/cubismmatrix44";
import { CubismUserModel } from "@framework/model/cubismusermodel";
import {
  ACubismMotion,
  FinishedMotionCallback,
} from "@framework/motion/acubismmotion";
import { CubismMotion } from "@framework/motion/cubismmotion";
import {
  CubismMotionQueueEntryHandle,
} from "@framework/motion/cubismmotionqueuemanager";

import { CubismUpdateScheduler } from "@framework/motion/cubismupdatescheduler";
import { CubismBreathUpdater } from "@framework/motion/cubismbreathupdater";
import { CubismLookUpdater } from "@framework/motion/cubismlookupdater";
import { CubismEyeBlinkUpdater } from "@framework/motion/cubismeyeblinkupdater";
import { CubismExpressionUpdater } from "@framework/motion/cubismexpressionupdater";
import { CubismPhysicsUpdater } from "@framework/motion/cubismphysicsupdater";
import { CubismPoseUpdater } from "@framework/motion/cubismposeupdater";
import { CubismLipSyncUpdater } from "@framework/motion/cubismlipsyncupdater";

import { LookParameterData, CubismLook } from "@framework/effect/cubismlook";

import { csmRect } from "@framework/type/csmrectf";

// local
import * as LAppDefine from "@/lappdefine";
import { LAppPal } from "@/lapppal";
import { LAppWavFileHandler } from "@/lappwavfilehandler";
import { Live2dViewer } from "@/live2dViewer";

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

export type EyeOpenParams = {
  lOpen?: number;
  rOpen?: number;
};

export class Live2dModel extends CubismUserModel {
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
  readFileFunction: (arg: string) => Promise<ArrayBuffer>;
  _wavFileHandler: LAppWavFileHandler;
  lipSyncWeight: number;
  eyeOpenParams: EyeOpenParams;
  isKeepOpenEyeValue: boolean;
  
  _look: CubismLook | null;

  private _updateScheduler: CubismUpdateScheduler;
  private _motionUpdated: boolean;

  protected manualClosedEye: boolean;
  protected motionFileList: string[];
  // key: [groupName, index]
  protected motionMap: Map<string, [string, number]>;

  public async startLipSync(bytes: ArrayBuffer): Promise<void> {
    await this._wavFileHandler.startWithBytes(bytes);
  }

  public relase(): void {
    if (this._look != null) {
      CubismLook.delete(this._look);
    }

    if (this._updateScheduler != null) {
      this._updateScheduler.release();
    }

    super.release();
  }

  public stopLipSync(): void {
    this._wavFileHandler.releasePcmData();
  }

  public releaseTextures(gl: WebGL2RenderingContext): void {
    if (this._textures.length === 0) {
      return;
    }

    for (const i of this._textures) {
      gl.deleteTexture(i);
    }

    this._textures.length = 0;
  }

  public releaseTextureByTexture(gl: WebGL2RenderingContext, texture: WebGLTexture): void {
    for (let i = 0; i < this._textures.length; i++) {
      if (this._textures[i].id !== texture) {
        continue;
      }

      gl.deleteTexture(i);
      this._textures[i] = null;
      this._textures.splice(i, 1);
      break;
    }
  }

  public releaseMotions(): void {
    if (this._motions.size > 0) {
      this._motions.clear();
    }
  }

  public releaseExpressions(): void {
    if (this._expressions.size > 0) {
      this._expressions.clear();
    }
  }

  public closeEyelids(): void {
    this.manualClosedEye = true;
  }

  public openEyelids(): void {
    this.manualClosedEye = false;
  }

  public keepEyeOpenParams(params: EyeOpenParams): void {
    let isChanged = false;

    if (params.lOpen != null) {
      isChanged = true;
    }

    if (params.rOpen != null) {
      isChanged = true;
    }

    if (isChanged) {
      this.eyeOpenParams = params;
      this.isKeepOpenEyeValue = true;
    }
  }

  public stopKeepEyeValue(): void {
    this.eyeOpenParams = {};
    this.isKeepOpenEyeValue = false;
  }

  public update(): void {
    const deltaTimeSeconds = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);

    // モーションによるパラメーター更新の有無
    let isMotionUpdated = false;

    // 前回セーブされたをロード
    this._model.loadParameters();
    // モーションを更新
    if (!this._motionManager.isFinished()) {
      isMotionUpdated = this._motionManager.updateMotion(
        this._model,
        deltaTimeSeconds,
      );
    }

    this._motionUpdated = false;

    // 状態を保存
    this._model.saveParameters();
    
    this._updateScheduler.onLateUpdate(this._model, deltaTimeSeconds);
    

    this._model.update();
  }

  protected async createTextureFromFile(
    fileName: string,
    usePremultiply: boolean,
    index: number,
    textureCount: number,
  ): Promise<void> {
    const readResult = await this.readFileFunction(fileName);

    const img = new Image();
    const byteArray = new Uint8ClampedArray(readResult);
    const url = URL.createObjectURL(
      new Blob([byteArray.buffer], { type: "image/png" }),
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
        _texture,
      );

      this._live2dViewer.gl.texParameteri(
        this._live2dViewer.gl.TEXTURE_2D,
        this._live2dViewer.gl.TEXTURE_MIN_FILTER,
        this._live2dViewer.gl.LINEAR_MIPMAP_LINEAR,
      );

      if (usePremultiply) {
        this._live2dViewer.gl.pixelStorei(
          this._live2dViewer.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
          1,
        );
      }

      this._live2dViewer.gl.texImage2D(
        this._live2dViewer.gl.TEXTURE_2D,
        0,
        this._live2dViewer.gl.RGBA,
        this._live2dViewer.gl.RGBA,
        this._live2dViewer.gl.UNSIGNED_BYTE,
        img,
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
      this._textures.push(textureInfo);

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

  protected async loadTextures(): Promise<void> {
    if (!this._modelSetting || this.isCompleteSetup) {
      return;
    }

    const usePremultiply = true;

    const textureCount = this._modelSetting.getTextureCount();

    for (let i = 0; i < textureCount; ++i) {
      const textureFileName = this._modelSetting.getTextureFileName(i);
      if (textureFileName === "") {
        continue;
      }
      const texturePath = `${this._modelHomeDir}${textureFileName}`;

      await this.createTextureFromFile(
        texturePath,
        usePremultiply,
        i,
        textureCount,
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
  protected async setupModel(
    setting: ICubismModelSetting,
    isPreloadMotion: boolean,
  ): Promise<void> {
    this._modelSetting = setting;
    const modelFileName = setting.getModelFileName();

    if (modelFileName === "") {
      return;
    }

    const filePath = `${this._modelHomeDir}${modelFileName}`;
    try {
      const bytesResult = await this.readFileFunction(filePath);
      this.loadModel(bytesResult, this._mocConsistency);
    } catch (e) {
      console.log(e);
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

      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${expressionFileName}`,
      );
      const motion = this.loadExpression(
        readResult,
        readResult.byteLength,
        expressionName,
      );

      if (this._expressions.get(expressionName) != null) {
        ACubismMotion.delete(this._expressions.get(expressionName));
        this._expressions.set(expressionName, null);
      }

      this._expressions.set(expressionName, motion);
      this._expressionCount++;

      if (this._expressionCount >= expressionCount) {
        if (this._expressionManager != null) {
          const expressionUpdater = new CubismExpressionUpdater(this._expressionManager);
          this._updateScheduler.addUpdatableList(expressionUpdater);
        }
      }
    }

    // Load Physics
    const physicsFileName = this._modelSetting.getPhysicsFileName();
    if (physicsFileName != null && physicsFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${physicsFileName}`,
      );
      this.loadPhysics(readResult, readResult.byteLength);

      if (this._physics != null) {
        const physicsUpdater = new CubismPhysicsUpdater(this._physics);
        this._updateScheduler.addUpdatableList(physicsUpdater);
      }
    }

    // Load Pose
    const poseFileName = this._modelSetting.getPoseFileName();
    if (poseFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${poseFileName}`,
      );
      this.loadPose(readResult, readResult.byteLength);

      if (this._pose != null) {
        const poseUpdater = new CubismPoseUpdater(this._pose);
        this._updateScheduler.addUpdatableList(poseUpdater);
      }
    }

    // Set Eye Blink params
    const eyeBlinkParameterSize =
      this._modelSetting.getEyeBlinkParameterCount();
    if (eyeBlinkParameterSize > 0) {
      this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
      const eyeBlinkUpdater = new CubismEyeBlinkUpdater(() => this._motionUpdated, this._eyeBlink);
      this._updateScheduler.addUpdatableList(eyeBlinkUpdater);

      for (let i = 0; i < this._modelSetting.getEyeBlinkParameterCount(); ++i) {
        this._eyeBlinkIds.push(
          this._modelSetting.getEyeBlinkParameterId(i),
        );
      }
    } else {
      // 本来はmoc3.jsonにEyeBlinkIdsが記述されている場合のみ実行すべきだが、記述されていない一部のモデルのために敢えてこうしている。
      this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
      this._eyeBlinkIds.push(this._idParamEyeLOpen);
      this._eyeBlinkIds.push(this._idParamEyeROpen);
      this._eyeBlink.setParameterIds(this._eyeBlinkIds);
      const eyeBlinkUpdater = new CubismEyeBlinkUpdater(() => this._motionUpdated, this._eyeBlink);
      this._updateScheduler.addUpdatableList(eyeBlinkUpdater);
    }

    // Breath
    this._breath = CubismBreath.create();
    const breathParameters: Array<BreathParameterData> = new Array();
    breathParameters.push(
      new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5),
    );

    breathParameters.push(
      new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5),
    );
    breathParameters.push(
      new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5),
    );
    breathParameters.push(
      new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5),
    );
    breathParameters.push(
      new BreathParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamBreath,
        ),
        0.5,
        0.5,
        3.2345,
        1,
      ),
    );
    this._breath.setParameters(breathParameters);
    const breathUpdater = new CubismBreathUpdater(this._breath);
    this._updateScheduler.addUpdatableList(breathUpdater);

    const userDataFileName = this._modelSetting.getUserDataFile();
    if (userDataFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${userDataFileName}`,
      );
      this.loadUserData(readResult, readResult.byteLength);
    }

    // set lipsync id
    const lipSyncIdCount = this._modelSetting.getLipSyncParameterCount();
    if (lipSyncIdCount > 0) {
      this._lipSyncIds.length = 0;
    }
    for (let i = 0; i < lipSyncIdCount; ++i) {
      this._lipSyncIds.push(this._modelSetting.getLipSyncParameterId(i));
    }

    if (this._lipSyncIds.length > 0) {
      const lipSyncUpdater = new CubismLipSyncUpdater(
        this._lipSyncIds,
        this._wavFileHandler
      );
      this._updateScheduler.addUpdatableList(lipSyncUpdater);
    }

    if (!this._modelMatrix) {
      console.log("modelMatrix is null");
      return;
    }


    this._look = CubismLook.create();
    const lookParameters: Array<LookParameterData> = [
      new LookParameterData(this._idParamAngleX, 30.0, 0.0, 0.0),
      new LookParameterData(this._idParamAngleY, 0.0, 30.0, 0.0),
      new LookParameterData(this._idParamAngleZ, 0.0, 0.0, -30.0),
      new LookParameterData(this._idParamBodyAngleX, 10.0, 0.0, 0.0),
      new LookParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamEyeBallX
        ),
        1.0,
        0.0,
        0.0
      ),
      new LookParameterData(
        CubismFramework.getIdManager().getId(
          CubismDefaultParameterId.ParamEyeBallY
        ),
        0.0,
        1.0,
        0.0
      )
    ];
    this._look.setParameters(lookParameters);
    const lookUpdater = new CubismLookUpdater(this._look, this._dragManager);
    this._updateScheduler.addUpdatableList(lookUpdater);

    
    // Layout
    const layout = new Map<string, number>();
    this._modelSetting.getLayoutMap(layout);
    this._modelMatrix.setupFromLayout(layout);

    this._model.saveParameters();
    this._allMotionCount = 0;
    this._motionCount = 0;
    const motionGroupCount: number = this._modelSetting.getMotionGroupCount();
    for (let i = 0; i < motionGroupCount; i++) {
      const groupName = this._modelSetting.getMotionGroupName(i);
      this._allMotionCount += this._modelSetting.getMotionCount(groupName);

      for (
        let motionIndex = 0;
        motionIndex < this._modelSetting.getMotionCount(groupName);
        ++motionIndex
      ) {
        const motionFileName = this._modelSetting.getMotionFileName(
          groupName,
          motionIndex,
        );
        this.motionMap.set(motionFileName, [groupName, motionIndex]);
        this.motionFileList.push(motionFileName);
      }

      if (isPreloadMotion) {
        await this.preLoadMotionGroup(groupName);
      }
    }

    if (motionGroupCount === 0 || !isPreloadMotion) {
      this._motionManager.stopAllMotions();

      const width = this._live2dViewer.canvas.width;
      const height = this._live2dViewer.canvas.height;
      this.createRenderer(width, height);

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
      readResult.byteLength,
    );
    await this.setupModel(setting, isPreloadMotion);
  }

  public draw(
    matrix: CubismMatrix44,
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    frameBuffer: WebGLFramebuffer | null,
  ): void {
    matrix.multiplyByMatrix(this._modelMatrix);
    this.getRenderer().setMvpMatrix(matrix);

    const viewPort = [x, y, canvasWidth, canvasHeight];
    this.getRenderer().setRenderState(
      frameBuffer as WebGLFramebuffer,
      viewPort,
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
    onFinishedMotionHandler?: FinishedMotionCallback,
  ): Promise<CubismMotionQueueEntryHandle> {
    const motionFileName = this._modelSetting.getMotionFileName(group, no);

    // ex) idle_0
    const name = `${group}_${no}`;
    let motion: CubismMotion = this._motions.get(name) as CubismMotion;
    let autoDelete = false;

    if (motion == null) {
      const path = `${this._modelHomeDir}${motionFileName}`;
      const bytes = await this.readFileFunction(path);
      motion = this.loadMotion(
        bytes,
        bytes.byteLength,
        null,
        onFinishedMotionHandler,
      );
      let fadeTime: number = this._modelSetting.getMotionFadeInTimeValue(
        group,
        no,
      );
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
    if (voice.localeCompare("") !== 0) {
      let path = voice;
      path = this._modelHomeDir + path;
      this._wavFileHandler.start(path);
    }

    if (this._debugMode) {
      LAppPal.printMessage(`[APP]start motion: [${group}_${no}`);
    }
    return this._motionManager.startMotion(
      motion,
      autoDelete,
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
    for (
      let index = 0;
      index < this._modelSetting.getMotionCount(group);
      index++
    ) {
      const motionFileName = this._modelSetting.getMotionFileName(group, index);

      // ex) idle_0
      const name = `${group}_${index}`;
      if (this._debugMode) {
        LAppPal.printMessage(
          `[APP]load motion: ${motionFileName} => [${name}]`,
        );
      }

      const motionFilePath = `${this._modelHomeDir}${motionFileName}`;
      const arrayBuffer = await this.readFileFunction(motionFilePath);

      const tmpMotion: CubismMotion = this.loadMotion(
        arrayBuffer,
        arrayBuffer.byteLength,
        name,
      );

      if (tmpMotion != null) {
        let fadeTime = this._modelSetting.getMotionFadeInTimeValue(
          group,
          index,
        );
        if (fadeTime >= 0.0) {
          tmpMotion.setFadeInTime(fadeTime);
        }

        fadeTime = this._modelSetting.getMotionFadeOutTimeValue(group, index);
        if (fadeTime >= 0.0) {
          tmpMotion.setFadeOutTime(fadeTime);
        }
        tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);

        if (this._motions.get(name) != null) {
          ACubismMotion.delete(this._motions.get(name));
        }

        this._motions.set(name, tmpMotion);
        this._allMotionCount++;
      } else {
        // loadMotionできなかった場合はモーションの総数がずれるので1つ減らす
        this._allMotionCount--;
      }
    }

    if (this._motionCount >= this._allMotionCount) {
      // 全てのモーションを停止する
      this._motionManager.stopAllMotions();

      this._updating = false;
      this._initialized = true;

      const width = this._live2dViewer.canvas.width;
      const height = this._live2dViewer.canvas.height;
      this.createRenderer(width, height);
      await this.loadTextures();
      if (this._live2dViewer.gl) {
        this.getRenderer().setIsPremultipliedAlpha(true);
        this.getRenderer().startUp(this._live2dViewer.gl);
      }
    }
  }

  /**
   * 引数で指定した表情モーションをセットする
   *
   * @param expressionId 表情モーションのID
   */
  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this._expressions.get(expressionId);

    if (this._debugMode) {
      LAppPal.printMessage(`expression: [${expressionId}]`);
    }

    if (motion != null) {
      this._expressionManager.startMotion(
        motion,
        false,
      );
    } else {
      if (this._debugMode) {
        LAppPal.printMessage(`expression[${expressionId}] is null`);
      }
    }
  }

  public stopExpression(): void {
    this._expressionManager.stopAllMotions();
  }

  public getExpressionIdList(): string[] {
    const result: string[] = [];
    for (const [key, _val] of this._expressions.entries()) {
      result.push(key);
    }

    return result;
  }

  public getMotionFileNameList(): string[] {
    return this.motionFileList;
  }

  public getMotionGroupAndIndex(
    motionFileName: string,
  ): [string, number] | undefined {
    try {
      const result = this.motionMap.get(motionFileName);
      return result;
    } catch (e) {
      return undefined;
    }
  }

  public stopAllMotion(): void {
    this._motionManager.stopAllMotions();
  }

  public setIdleMotion(): void {
    const motionGroupCount: number = this._modelSetting.getMotionGroupCount();
    for (let i = 0; i < motionGroupCount; i++) {
      const groupName = this._modelSetting.getMotionGroupName(i);
      this._allMotionCount += this._modelSetting.getMotionCount(groupName);
      if (groupName === "Idle") {
        this.startMotion(groupName, 0);
      }
    }
  }

  public reloadRenderer(): void {
    this.deleteRenderer();

    const width = this._live2dViewer.canvas.width;
    const height = this._live2dViewer.canvas.height;
    this.createRenderer(width, height);
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

    this._eyeBlinkIds = new Array<CubismIdHandle>();
    this._lipSyncIds = new Array<CubismIdHandle>();

    this._motions = new Map<string, ACubismMotion>();
    this._expressions = new Map<string, ACubismMotion>();

    this._hitArea = new Array<csmRect>();
    this._userArea = new Array<csmRect>();

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
      this._idParamEyeLOpen =
        CubismFramework.getIdManager().getId("PARAM_EYE_L_OPEN");
      this._idParamEyeROpen =
        CubismFramework.getIdManager().getId("PARAM_EYE_R_OPEN");

      const idParamMouthOpenY =
        CubismFramework.getIdManager().getId("PARAM_MOUTH_OPEN_Y");
      this._lipSyncIds.push(idParamMouthOpenY);
    } else {
      this._idParamAngleX = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamAngleX,
      );
      this._idParamAngleY = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamAngleY,
      );
      this._idParamAngleZ = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamAngleZ,
      );

      this._idParamEyeBallX = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamEyeBallX,
      );
      this._idParamEyeBallY = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamEyeBallY,
      );

      this._idParamBodyAngleX = CubismFramework.getIdManager().getId(
        CubismDefaultParameterId.ParamBodyAngleX,
      );

      this._idParamEyeLOpen =
        CubismFramework.getIdManager().getId("ParamEyeLOpen");
      this._idParamEyeROpen =
        CubismFramework.getIdManager().getId("ParamEyeROpen");
      const idParamMouthOpenY =
        CubismFramework.getIdManager().getId("ParamMouthOpenY");
      this._lipSyncIds.push(idParamMouthOpenY);
    }

    if (LAppDefine.MOCConsistencyValidationEnable) {
      this._mocConsistency = true;
    }

    this._allMotionCount = 0;
    this._motionCount = 0;
    this._textureCount = 0;
    this._expressionCount = 0;
    this._state = 0;

    this._textures = new Array<TextureInfo>();
    this._live2dViewer = live2dViewer;

    this.isCompleteSetup = false;
    this.readFileFunction = readFileFunction;
    this._wavFileHandler = new LAppWavFileHandler();
    this.lipSyncWeight = 0.8;
    this.manualClosedEye = false;
    this.motionFileList = [];
    this.motionMap = new Map();
    this.eyeOpenParams = {};
    this.isKeepOpenEyeValue = false;
    this._look = null;
    this._updateScheduler = new CubismUpdateScheduler();
    this._motionUpdated = false;
  }
}
