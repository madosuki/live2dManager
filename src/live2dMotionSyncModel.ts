/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismDefaultParameterId } from "../CubismSdkForWeb/src/cubismdefaultparameterid";
import {
  BreathParameterData,
  CubismBreath,
} from "../CubismSdkForWeb/src/effect/cubismbreath";
import { CubismEyeBlink } from "../CubismSdkForWeb/src/effect/cubismeyeblink";
import { CubismFramework } from "../CubismSdkForWeb/src/live2dcubismframework";
import { ACubismMotion } from "../CubismSdkForWeb/src/motion/acubismmotion";
import { csmMap } from "../CubismSdkForWeb/src/type/csmmap";
import { csmString } from "../CubismSdkForWeb/src/type/csmstring";
import { csmVector } from "../CubismSdkForWeb/src/type/csmvector";
import { CubismModelMotionSyncSettingJson } from "../CubismWebMotionSyncComponents/Framework/src/cubismmodelmotionsyncsettingjson";
import { CubismMotionSync } from "../CubismWebMotionSyncComponents/Framework/src/live2dcubismmotionsync";
import { LAppAudioManager } from "./lappaudiomanager";
import * as LAppMotionSyncDefine from "./lappmotionsyncdefine";
import { LAppPal } from "./lapppal";
import { Live2dModel } from "./live2dModel";
import { Live2dViewer } from "./live2dViewer";

export class Live2dMotionSyncModel extends Live2dModel {
  override _modelSetting: CubismModelMotionSyncSettingJson | null;
  _soundFileList: csmVector<csmString>;
  _soundIndex: number;
  _soundData: LAppAudioManager;
  _motionSync: CubismMotionSync;
  _lastSampleCount: number;
  _isStartMotinoSync: boolean;

  constructor(
    modelHomeDir: string,
    modelJsonFileName: string,
    live2dViewer: Live2dViewer,
    readFileFunction: (arg: string) => Promise<ArrayBuffer>,
  ) {
    super(
      modelHomeDir,
      modelJsonFileName,
      live2dViewer,
      readFileFunction,
      false,
    );

    this._modelSetting = null;
    this._soundFileList = new csmVector<csmString>();
    this._soundIndex = 0;
    this._soundData = new LAppAudioManager();
    this._lastSampleCount = 0;
    this._isStartMotinoSync = false;
  }

  protected override async setupModel(
    setting: CubismModelMotionSyncSettingJson,
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
        `${this._modelHomeDir}${physicsFileName}`,
      );
      this.loadPhysics(readResult, readResult.byteLength);
    }

    // Load Pose
    const poseFileName = this._modelSetting.getPoseFileName();
    if (poseFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${poseFileName}`,
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
      new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5),
    );

    breathParameters.pushBack(
      new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5),
    );
    breathParameters.pushBack(
      new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5),
    );
    breathParameters.pushBack(
      new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5),
    );
    breathParameters.pushBack(
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

    const userDataFileName = this._modelSetting.getUserDataFile();
    if (userDataFileName !== "") {
      const readResult = await this.readFileFunction(
        `${this._modelHomeDir}${userDataFileName}`,
      );
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
    if (motionSyncFileName != null || motionSyncFileName !== "NullValue") {
      const data = await this.readFileFunction(
        `${this._modelHomeDir}${motionSyncFileName}`,
      );
      this.loadMotionSync(data, data.byteLength);
      this._soundFileList = this._modelSetting.getMotionSyncSoundFileList();
      this._soundIndex = 0;
    }

    const width = this._live2dViewer.canvas.width;
    const height = this._live2dViewer.canvas.height;
    this.createRenderer(width, height);

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

  public override async loadAssets(): Promise<void> {
    const filePath = `${this._modelHomeDir}${this._modelJsonFileName}`;
    const readResult = await this.readFileFunction(filePath);
    const setting = new CubismModelMotionSyncSettingJson(
      readResult,
      readResult.byteLength,
    );
    await this.setupModel(setting);
  }

  /**
   * モーションシンクデータの読み込み
   * @param buffer  physics3.jsonが読み込まれているバッファ
   * @param size    バッファのサイズ
   */
  private loadMotionSync(buffer: ArrayBuffer, size: number) {
    if (buffer == null || size === 0) {
      // CubismLogError('Failed to loadMotionSync().');
      return;
    }

    this._motionSync = CubismMotionSync.create(
      this._model,
      buffer,
      size,
      LAppMotionSyncDefine.SamplesPerSec,
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
      0,
    );

    this._soundData.playByIndex(this._soundIndex);
  }

  public async startMotionSync(bytes: ArrayBuffer): Promise<void> {
    if (!this._motionSync) return;

    const audioMnager = this._soundData
      .getSoundBufferContext()
      .getAudioManager();
    await audioMnager.createAudioFromBytes(bytes, 0);

    const buffer = this._soundData
      .getSoundBufferContext()
      .getBufferForSinglePlay();
    this._motionSync.setSoundBuffer(0, buffer, 0);

    const audioInfo = this._soundData
      .getSoundBufferContext()
      .getAudioManager()
      ._audios.at(this._soundIndex);
    const currentAudioTime = performance.now() / 1000; // convert to seconds.

    // 前回フレームの時間が現在時刻よりも前だった場合は同時刻として扱う
    if (currentAudioTime < audioInfo.audioContextPreviousTime) {
      audioInfo.audioContextPreviousTime = currentAudioTime;
    }
    audioInfo.audioContextPreviousTime = currentAudioTime;

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
    /*
  const soundBuffer = this._soundData
    .getSoundBufferContext()
    .getBuffers()
    .at(this._soundIndex);
  */
    const soundBuffer = this._soundData
      .getSoundBufferContext()
      .getBufferForSinglePlay();
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
      audioInfo.audioElapsedTime * audioInfo.wavhandler.getWavSamplingRate(),
    );

    // 処理済みの再生位置が音声のサンプル数を超えていたら、処理を行わない。
    if (audioInfo.previousSamplePosition <= audioInfo.audioSamples.length) {
      // 前回の再生位置を起点に、音声サンプルを再生済みの数だけ取得する。
      const currentAudioSamples = audioInfo.audioSamples.slice(
        audioInfo.previousSamplePosition,
        currentSamplePosition,
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
        lastTotalProcessedCount,
      );

      // 再生済みのサンプル数と再生時間を現在のものへ更新する。
      audioInfo.audioContextPreviousTime = currentAudioTime;
      audioInfo.previousSamplePosition = currentSamplePosition;
    }
  }

  public override update(): void {
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
      isMotionUpdated = this._motionManager.updateMotion(
        this._model,
        deltaTimeSeconds,
      );
    }
    // 状態を保存
    this._model.saveParameters();

    // まばたき
    if (!isMotionUpdated && this._eyeBlink != null) {
      if (this.manualClosedEye) {
        this._model.setParameterValueById(this._idParamEyeLOpen, -0.5);
        this._model.setParameterValueById(this._idParamEyeROpen, -0.5);
      }

      if (!this.manualClosedEye) {
        this._eyeBlink.updateParameters(this._model, deltaTimeSeconds);
      }
    }

    // 表情
    if (this._expressionManager != null) {
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds);
    }

    // ドラッグによる顔の向きの調整
    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30);
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30,
    ); // -30から30の値を加える

    // ドラッグによる体の向きの調整
    this._model.addParameterValueById(
      this._idParamBodyAngleX,
      this._dragX * 10,
    ); // -10から10の値を加える

    // ドラッグによる目の向きの調整
    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX);
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    // 呼吸など
    if (this._breath != null) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    // 物理演算の設定
    if (this._physics != null) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    // リップシンクの設定
    if (this._lipsync && !this._isStartMotinoSync) {
      let value = 0.0;
      this._wavFileHandler.update(deltaTimeSeconds);
      value = this._wavFileHandler.getRms();

      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
        if (value <= 0.0) break;
        this._model.addParameterValueById(
          this._lipSyncIds.at(i),
          value,
          this.lipSyncWeight,
        );
      }
    }

    // ポーズの設定
    if (this._pose != null) {
      this._pose.updateParameters(this._model, deltaTimeSeconds);
    }

    if (this._isStartMotinoSync) {
      this.updateMotionSync();
    }

    this._model.update();
  }

  public override release(): void {
    super.release();

    if (this._motionSync) {
      this._motionSync.release();
      this._motionSync = null;
    }

    if (this._soundFileList) {
      this._soundFileList?.clear();
      this._soundFileList = null;
    }

    if (this._soundData) {
      this._soundData?.release();
      this._soundData = null;
    }
  }
}
