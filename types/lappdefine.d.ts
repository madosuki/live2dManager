/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */
import { LogLevel } from "../CubismSdkForWeb/src/live2dcubismframework";
/**
 * Sample Appで使用する定数
 */
export declare const CanvasSize: {
    width: number;
    height: number;
} | "auto";
export declare const ViewScale = 1;
export declare const ViewMaxScale = 2;
export declare const ViewMinScale = 0.8;
export declare const ViewLogicalLeft = -1;
export declare const ViewLogicalRight = 1;
export declare const ViewLogicalBottom = -1;
export declare const ViewLogicalTop = 1;
export declare const ViewLogicalMaxLeft = -2;
export declare const ViewLogicalMaxRight = 2;
export declare const ViewLogicalMaxBottom = -2;
export declare const ViewLogicalMaxTop = 2;
export declare const ResourcesPath = "../../Resources/";
export declare const BackImageName = "back_class_normal.png";
export declare const GearImageName = "icon_gear.png";
export declare const PowerImageName = "CloseNormal.png";
export declare const ModelDir: string[];
export declare const ModelDirSize: number;
export declare const MotionGroupIdle = "Idle";
export declare const MotionGroupTapBody = "TapBody";
export declare const HitAreaNameHead = "Head";
export declare const HitAreaNameBody = "Body";
export declare const PriorityNone = 0;
export declare const PriorityIdle = 1;
export declare const PriorityNormal = 2;
export declare const PriorityForce = 3;
export declare const MOCConsistencyValidationEnable = true;
export declare const DebugLogEnable = true;
export declare const DebugTouchLogEnable = false;
export declare const CubismLoggingLevel: LogLevel;
export declare const RenderTargetWidth = 1900;
export declare const RenderTargetHeight = 1000;
