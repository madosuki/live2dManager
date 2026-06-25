/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */
export declare class TouchManager {
    /**
     * コンストラクタ
     */
    constructor();
    getCenterX(): number;
    getCenterY(): number;
    getDeltaX(): number;
    getDeltaY(): number;
    getStartX(): number;
    getStartY(): number;
    getScale(): number;
    getX(): number;
    getY(): number;
    getX1(): number;
    getY1(): number;
    getX2(): number;
    getY2(): number;
    isSingleTouch(): boolean;
    isFlickAvailable(): boolean;
    disableFlick(): void;
    /**
     * タッチ開始時イベント
     * @param deviceX タッチした画面のxの値
     * @param deviceY タッチした画面のyの値
     */
    touchesBegan(deviceX: number, deviceY: number): void;
    /**
     * ドラッグ時のイベント
     * @param deviceX タッチした画面のxの値
     * @param deviceY タッチした画面のyの値
     */
    touchesMoved(deviceX: number, deviceY: number): void;
    /**
     * フリックの距離測定
     * @return フリック距離
     */
    getFlickDistance(): number;
    /**
     * 点１から点２への距離を求める
     *
     * @param x1 １つ目のタッチした画面のxの値
     * @param y1 １つ目のタッチした画面のyの値
     * @param x2 ２つ目のタッチした画面のxの値
     * @param y2 ２つ目のタッチした画面のyの値
     */
    calculateDistance(x1: number, y1: number, x2: number, y2: number): number;
    /**
     * ２つ目の値から、移動量を求める。
     * 違う方向の場合は移動量０。同じ方向の場合は、絶対値が小さい方の値を参照する。
     *
     * @param v1 １つ目の移動量
     * @param v2 ２つ目の移動量
     *
     * @return 小さい方の移動量
     */
    calculateMovingAmount(v1: number, v2: number): number;
    _startY: number;
    _startX: number;
    _lastX: number;
    _lastY: number;
    _lastX1: number;
    _lastY1: number;
    _lastX2: number;
    _lastY2: number;
    _lastTouchDistance: number;
    _deltaX: number;
    _deltaY: number;
    _scale: number;
    _touchSingle: boolean;
    _flipAvailable: boolean;
}
