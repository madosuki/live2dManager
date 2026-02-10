/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismMotionSync } from "../CubismWebMotionSyncComponents/Framework/src/live2dcubismmotionsync";
import {
  AudioInfo,
  LAppMotionSyncAudioManager,
} from "./lappmotionsyncaudiomanager";
import { Live2dMotionSyncModel } from "./live2dMotionSyncModel";

export class LAppAudioManager {
  /**
   * パスからの音声ファイルの読み込み
   *
   * @param path ファイルパス
   */
  public loadFile(
    path: string,
    index: number,
    model: Live2dMotionSyncModel,
    motionSync: CubismMotionSync,
  ): void {
    this._soundBufferContext
      .getAudioManager()
      .createAudioFromFile(
        path,
        index,
        model,
        motionSync,
        null,
        (
          audioInfo: AudioInfo,
          index: number,
          model: Live2dMotionSyncModel,
          motionSync: CubismMotionSync,
        ): void => {
          this._soundBufferContext
            .getBuffers();
            .set(index, new Array<number>());
        },
      );
  }

  /**
   * 更新
   */
  public update(): void {}

  /**
   * 指定したインデックスの音声コンテキストが待機状態になっているかを判定する
   *
   * @param index 指定するインデックス
   * @returns 音声コンテキストが待機状態になっているか？
   */
  public isSuspendedContextByIndex(index: number): boolean {
    const audioContext = this.getSoundBufferContext()
      .getAudioManager()
      ._audios.at(index).audioContext;

    return audioContext.state === "suspended";
  }

  /**
   * インデックスを使って音声を再生する。
   *
   * @param index インデックス
   */
  public playByIndex(index: number): void {
    if (this.isPlayByIndex(index)) {
      return;
    }

    const audioContext = this.getSoundBufferContext()
      .getAudioManager()
      ._audios.at(index).audioContext;

    // まだ待機状態だったらrunningにする
    if (this.isSuspendedContextByIndex(index)) {
      audioContext.resume().then(() => {
        this._soundBufferContext.getAudioManager().playByIndex(index);
      });
    } else {
      this._soundBufferContext.getAudioManager().playByIndex(index);
    }
  }

  /**
   * インデックスを使って音声の再生を停止する。
   *
   * @param index インデックス
   */
  public stopByIndex(index: number): void {
    if (!this.isPlayByIndex(index)) {
      return;
    }

    this._soundBufferContext.getAudioManager().stopByIndex(index);

    // バッファの中身をクリアする。
    const buffer = this._soundBufferContext.getBuffers()[index];
    buffer.clear();
  }

  public stopForSinglePlay(): void {
    const buffer = this._soundBufferContext.getBufferForSinglePlay();
    if (buffer != null) return;
    buffer.clear();
  }

  /**
   * インデックスを使って音声が再生中か判定する。
   *
   * @param index インデックス
   * @returns 再生中か？
   */
  public isPlayByIndex(index: number): boolean {
    return this._soundBufferContext.getAudioManager().isPlayByIndex(index);
  }

  public getSoundBufferContext(): SoundBufferContext {
    return this._soundBufferContext;
  }

  public constructor() {
    this._soundBufferContext = new SoundBufferContext();
  }

  public release() {
    if (this._soundBufferContext) {
      this._soundBufferContext.release();
      this._soundBufferContext = void 0;
    }
  }

  private _soundBufferContext: SoundBufferContext;
}

export class SoundBufferContext {
  public getBuffers(): Array<Array<number>> {
    return this._buffers;
  }

  public getBufferForSinglePlay(): Array<number> {
    return this._bufferForSinglePlay;
  }

  public getAudioManager(): LAppMotionSyncAudioManager {
    return this._audioManager;
  }

  public constructor(
    buffers?: Array<Array<number>>,
    audioManager?: LAppMotionSyncAudioManager,
  ) {
    this._buffers = buffers ? buffers : new Array<Array<number>>();
    this._bufferForSinglePlay = new Array<number>();
    this._audioManager = audioManager
      ? audioManager
      : new LAppMotionSyncAudioManager();
  }

  public release() {
    if (this._buffers != null) {
      this._buffers = void 0;
    }

    if (this._bufferForSinglePlay != null) {
      this._bufferForSinglePlay = void 0;
    }

    if (this._audioManager != null) {
      this._audioManager.release();
      this._audioManager = void 0;
    }
  }

  private _bufferForSinglePlay: Array<number>;
  private _buffers: Array<Array<number>>;
  private _audioManager: LAppMotionSyncAudioManager;
}
