/**
 * Cleanvoice SDK - Official TypeScript SDK for Cleanvoice AI
 * 
 * @example
 * ```typescript
 * import { Cleanvoice } from 'cleanvoice-sdk';
 * 
 * const cv = new Cleanvoice({ apiKey: process.env.CLEANVOICE_KEY! });
 * 
 * const { audio, transcript } = await cv.process(
 *   "https://example.com/audio.mp3",
 *   { fillers: true, normalize: true, transcription: true, summarize: true }
 * );
 * 
 * console.log(transcript.summary);
 * ```
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