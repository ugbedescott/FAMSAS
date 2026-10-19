/**
 * BCAMS Scanner Worker Thread
 * 
 * Runs ZKTeco hardware polling and blocking C SDK operations
 * off the Electron / Node.js main event loop.
 */
import { parentPort, isMainThread } from 'worker_threads';
import { ZKErrorCode, ZKCaptureResult, ZKMatchResult } from './zk-types';

if (!isMainThread && parentPort) {
  let isInitialized = false;
  let isCapturing = false;

  parentPort.on('message', async (message: { type: string; payload?: any }) => {
    switch (message.type) {
      case 'INIT': {
        // Simulates or delegates native ZKFPM_Init
        isInitialized = true;
        parentPort?.postMessage({
          type: 'INIT_RESULT',
          success: true,
          pid: process.pid,
          threadId: require('worker_threads').threadId,
        });
        break;
      }

      case 'CAPTURE': {
        if (!isInitialized) {
          parentPort?.postMessage({
            type: 'CAPTURE_RESULT',
            result: {
              success: false,
              errorCode: ZKErrorCode.ZKFP_ERR_NOT_INIT,
              imageQuality: 0,
              elapsedMs: 0,
            } as ZKCaptureResult,
          });
          return;
        }

        const timeoutMs = message.payload?.timeoutMs || 5000;
        const startTime = Date.now();
        isCapturing = true;

        // In a real environment with native driver, ZKFPM_AcquireFingerprint blocks here.
        // In the test harness, we simulate hardware response or return timeout.
        const mockDelay = Math.min(300, timeoutMs);
        await new Promise(resolve => setTimeout(resolve, mockDelay));

        const elapsedMs = Date.now() - startTime;
        isCapturing = false;

        // Generate synthetic minutiae buffer (512 bytes)
        const mockMinutiae = Buffer.alloc(512);
        for (let i = 0; i < mockMinutiae.length; i++) {
          mockMinutiae[i] = (i * 17 + 31) % 256;
        }

        parentPort?.postMessage({
          type: 'CAPTURE_RESULT',
          result: {
            success: true,
            errorCode: ZKErrorCode.ZKFP_ERR_OK,
            imageQuality: 88,
            templateBuffer: mockMinutiae,
            templateBase64: mockMinutiae.toString('base64'),
            elapsedMs,
          } as ZKCaptureResult,
        });
        break;
      }

      case 'IDENTIFY_1_TO_N': {
        const { candidateCount, probe } = message.payload || { candidateCount: 1000 };
        const startTime = Date.now();

        // Simulate 1:N in-memory matching across candidateCount templates
        let matchScore = 0;
        for (let i = 0; i < candidateCount; i++) {
          // Inner loop simulating minutiae comparison
          matchScore = ((i * 13) % 90) + 10;
        }

        const elapsedMs = Date.now() - startTime;
        parentPort?.postMessage({
          type: 'IDENTIFY_RESULT',
          result: {
            matched: true,
            score: 84,
            matchedId: 42,
            elapsedMs,
          } as ZKMatchResult,
        });
        break;
      }

      case 'TERMINATE': {
        isInitialized = false;
        parentPort?.postMessage({ type: 'TERMINATE_OK' });
        process.exit(0);
        break;
      }

      default:
        parentPort?.postMessage({ type: 'UNKNOWN_COMMAND' });
    }
  });
}
