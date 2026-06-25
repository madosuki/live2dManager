/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */
/**
 * プラットフォーム依存機能を抽象化する Cubism Platform Abstraction Layer.
 *
 * ファイル読み込みや時刻取得等のプラットフォームに依存する関数をまとめる。
 */
export declare class LAppPal {
    /**
     * ファイルをバイトデータとして読みこむ
     *
     * @param filePath 読み込み対象ファイルのパス
     * @return
     * {
     *      buffer,   読み込んだバイトデータ
     *      size        ファイルサイズ
     * }
     */
    static loadFileAsBytes(filePath: string, callback: (arrayBuffer: ArrayBuffer, size: number) => void): void;
    /**
     * デルタ時間（前回フレームとの差分）を取得する
     * @return デルタ時間[ms]
     */
    static getDeltaTime(): number;
    static updateTime(): void;
    /**
     * メッセージを出力する
     * @param message 文字列
     */
    static printMessage(message: string): void;
    static lastUpdate: number;
    static s_currentFrame: number;
    static s_lastFrame: number;
    static s_deltaTime: number;
}
