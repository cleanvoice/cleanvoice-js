/**
 * Official TypeScript SDK for Cleanvoice AI - AI-powered audio processing
 * 
 * @example
 * import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';
 * 
 * const cv = new Cleanvoice({ apiKey: 'your-api-key' });
 * const result = await cv.process('audio-url', { fillers: true });
 */

// Main SDK class
export { Cleanvoice } from './cleanvoice';

// All types including the new progress types
export type {
  CleanvoiceConfig,
  ProcessingConfig,
  ProcessResult,
  EditStatus,
  EditStatistics,
  Chapter,
  Summarization,
  TranscriptionWord,
  TranscriptionParagraph,
  DetailedTranscription,
  SimpleTranscriptionParagraph,
  Transcription,
  EditResult,
  RetrieveEditResponse,
  ApiError,
  ProcessingProgress,
  ProgressCallback,
  PollingConfig,
} from './types';

// Utility functions that might be useful for developers
export {
  isUrl,
  isValidAudioFile,
  isValidVideoFile,
  isValidMediaFile,
} from './utils/file-handler';

// Default export for convenience
import { Cleanvoice } from './cleanvoice';
export default Cleanvoice; 