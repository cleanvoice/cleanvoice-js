/**
 * Official TypeScript SDK for Cleanvoice AI - AI-powered audio processing
 * 
 * @example
 * import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';
 * 
 * const cv = new Cleanvoice({ apiKey: 'your-api-key' });
 * const result = await cv.process('audio-url', { fillers: true });
 */

export { Cleanvoice } from './cleanvoice';
export { ApiError } from './types';

export type {
  AccountInfo,
  CreditInfo,
  CleanvoiceConfig,
  ProcessingConfig,
  ProcessResult,
  ProcessOptions,
  EditOptions,
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
  ProcessingProgress,
  ProgressCallback,
  ProgressCallbackData,
  PollingConfig,
  DownloadableMedia,
  TranscriptResult,
  TimestampMarkers,
} from './types';

export {
  downloadFile,
  isUrl,
  isValidAudioFile,
  isValidVideoFile,
  isValidMediaFile,
  resolveDownloadDestination,
  signedUrlToPublicUrl,
  uploadLocalFile,
} from './utils/file-handler';

import { Cleanvoice } from './cleanvoice';
export default Cleanvoice; 