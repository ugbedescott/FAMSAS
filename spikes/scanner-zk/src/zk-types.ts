/**
 * BCAMS ZKTeco Fingerprint SDK Type Definitions
 * 
 * Maps native C function signatures, parameter codes, buffer specifications,
 * and error constants for ZKFinger SDK (v5.0 and v10.0).
 */

export type IntPtr = number;
export type Handle = number | bigint;

export enum ZKErrorCode {
  ZKFP_ERR_OK = 0,
  ZKFP_ERR_ALREADY_INIT = 1,
  ZKFP_ERR_INITLIB = -1,
  ZKFP_ERR_INIT = -2,
  ZKFP_ERR_NO_DEVICE = -3,
  ZKFP_ERR_NOT_SUPPORT = -4,
  ZKFP_ERR_INVALID_PARAM = -5,
  ZKFP_ERR_OPEN = -6,
  ZKFP_ERR_INVALID_HANDLE = -7,
  ZKFP_ERR_CAPTURE = -8,
  ZKFP_ERR_EXTRACT_FP = -9,
  ZKFP_ERR_ABSORT = -10,
  ZKFP_ERR_MEMORY_NOT_ENOUGH = -11,
  ZKFP_ERR_BUSY = -12,
  ZKFP_ERR_ADD_FINGER = -13,
  ZKFP_ERR_DEL_FINGER = -14,
  ZKFP_ERR_FAIL = -17,
  ZKFP_ERR_CANCEL = -18,
  ZKFP_ERR_VERIFY_FP = -20,
  ZKFP_ERR_MERGE = -22,
  ZKFP_ERR_NOT_OPENED = -23,
  ZKFP_ERR_NOT_INIT = -24,
  ZKFP_ERR_ALREADY_OPENED = -25,
}

export enum ZKParameterCode {
  PARAM_IMAGE_WIDTH = 1,
  PARAM_IMAGE_HEIGHT = 2,
  PARAM_IMAGE_DPI = 3,
  PARAM_ANTISPOOF_LFD = 101, // Live-Finger Detection parameter code
  PARAM_SDK_VERSION = 102,
}

export interface ZKDeviceInfo {
  deviceIndex: number;
  handle?: Handle;
  width: number;
  height: number;
  dpi: number;
  serialNumber?: string;
  hasLFD: boolean; // Live Finger Detection available
  transport: 'usb' | 'bluetooth_spp' | 'bluetooth_ble';
}

export interface ZKCaptureResult {
  success: boolean;
  errorCode: ZKErrorCode;
  imageQuality: number; // 0 - 100 quality score
  templateBuffer?: Buffer; // 512 to 2048 bytes
  templateBase64?: string;
  imageBuffer?: Buffer;
  lfdScore?: number; // Anti-spoofing score if available
  elapsedMs: number;
}

export interface ZKEnrollmentResult {
  success: boolean;
  errorCode: ZKErrorCode;
  regTemplateBuffer?: Buffer;
  regTemplateBase64?: string;
  sizeBytes: number;
  capturesMerged: number; // typically 3
}

export interface ZKMatchResult {
  matched: boolean;
  score: number; // comparison score 0 - 100+
  matchedId?: number | string;
  elapsedMs: number;
}

export interface ZKDatabaseStats {
  capacity: number;
  enrolledCount: number;
  averageSearchTimeMs: number;
}

/**
 * Recommended Hardware Abstraction Port for C2.6
 */
export interface IScannerPort {
  readonly transport: 'usb' | 'bluetooth';
  readonly isConnected: boolean;
  readonly modelName: string;
  readonly serialNumber: string;

  connect(): Promise<boolean>;
  disconnect(): Promise<boolean>;
  capture(timeoutMs?: number): Promise<ZKCaptureResult>;
  enroll(samples: Buffer[]): Promise<ZKEnrollmentResult>;
  identify(probe: Buffer): Promise<ZKMatchResult>;
  verify(probe: Buffer, reference: Buffer): Promise<ZKMatchResult>;
}
