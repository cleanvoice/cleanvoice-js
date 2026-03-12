/**
 * Configuration options for audio processing.
 */
export interface ProcessingConfig {
  video?: boolean;
  send_email?: boolean;
  audio_for_edl?: boolean;
  long_silences?: boolean;
  stutters?: boolean;
  fillers?: boolean;
  mouth_sounds?: boolean;
  hesitations?: boolean;
  muted?: boolean;
  remove_noise?: boolean;
  keep_music?: boolean;
  breath?: boolean | string;
  normalize?: boolean;
  autoeq?: boolean;
  studio_sound?: string | boolean;
  sound_studio?: string | boolean;
  mute_lufs?: number;
  target_lufs?: number;
  export_format?: 'auto' | 'mp3' | 'wav' | 'flac' | 'm4a';
  transcription?: boolean;
  summarize?: boolean;
  social_content?: boolean;
  export_timestamps?: boolean;
  signed_url?: string;
  merge?: boolean;
  automix?: boolean;
  trim?: boolean;
  waveform_preview?: boolean;
}

export interface EditInput {
  files: string[];
  config: ProcessingConfig;
  upload_type?: string;
  template_id?: number;
}

export interface CreateEditRequest {
  input: EditInput;
}

export interface CreateEditResponse {
  id: string;
}

export type EditStatus =
  | 'FAILURE'
  | 'PENDING'
  | 'POSTPROCESSING'
  | 'PROCESSING'
  | 'QUEUED'
  | 'RETRY'
  | 'STARTED'
  | 'SUCCESS';

export interface EditStatistics {
  BREATH?: number;
  DEADAIR?: number;
  STUTTERING?: number;
  MOUTH_SOUND?: number;
  FILLER_SOUND?: number;
}

export interface Chapter {
  start: number;
  title: string;
}

export interface Summarization {
  title: string;
  summary: string;
  chapters: Chapter[];
  summaries: string[];
  key_learnings: string;
  summary_of_summary: string;
  episode_description: string;
}

export interface TranscriptionWord {
  id: number;
  end: number;
  text: string;
  start: number;
}

export interface TranscriptionParagraph {
  id: number;
  end: number;
  start: number;
  speaker: string;
}

export interface DetailedTranscription {
  words: TranscriptionWord[];
  paragraphs: TranscriptionParagraph[];
}

export interface SimpleTranscriptionParagraph {
  end: number;
  text: string;
  start: number;
}

export interface Transcription {
  paragraphs: SimpleTranscriptionParagraph[];
  transcription: DetailedTranscription;
}

export type TimestampMarkers = Record<string, string> | string[];

export interface EditResult {
  video: boolean;
  filename: string;
  statistics: EditStatistics;
  download_url: string;
  summarization?: Summarization | [];
  transcription?: Transcription | [];
  social_content?: unknown[];
  merged_audio_url?: string[] | string;
  timestamps_markers_urls?: TimestampMarkers;
  waveform_result?: unknown;
}

export interface ProcessingProgress {
  done: number;
  total: number;
  state: string;
  phase: number;
  step: number;
  substep: number;
  job_name: string;
}

export interface RetrieveEditResponse {
  status: EditStatus;
  result?: ProcessingProgress | EditResult;
  task_id: string;
}

export interface ProgressCallbackData {
  status: EditStatus;
  progress?: ProcessingProgress;
  result?: ProcessingProgress | EditResult;
  editId: string;
  attempt: number;
}

export type ProgressCallback = (data: ProgressCallbackData) => void;

export interface PollingConfig {
  interval?: number;
  initialDelay?: number;
  maxAttempts?: number;
  onProgress?: ProgressCallback;
  logProgress?: boolean;
  successResultGraceAttempts?: number;
  maxTransientErrors?: number;
}

export interface EditOptions {
  templateId?: number;
  uploadType?: string;
}

export interface ProcessOptions extends EditOptions {
  polling?: PollingConfig;
  outputPath?: string;
  download?: boolean;
}

export interface CleanvoiceConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface CreditInfo {
  total: number;
  subscription: number;
  payg: number;
}

export interface AccountInfo {
  credit: CreditInfo;
}

export interface DownloadableMedia {
  url: string;
  filename: string;
  statistics: EditStatistics;
  localPath?: string;
  mergedAudioUrl?: string[] | string;
  timestampsMarkersUrls?: TimestampMarkers;
  waveformResult?: unknown;
  download(outputPath?: string): Promise<string>;
}

export interface TranscriptResult {
  text: string;
  paragraphs: SimpleTranscriptionParagraph[];
  detailed: DetailedTranscription;
  summary?: string;
  title?: string;
  chapters?: Chapter[];
  summarization?: Summarization;
}

export interface ProcessResult {
  audio: DownloadableMedia;
  media: DownloadableMedia;
  video: boolean;
  isVideo: boolean;
  transcript?: TranscriptResult;
  summarization?: Summarization;
  socialContent: unknown[];
  timestampsMarkersUrls?: TimestampMarkers;
  waveformResult?: unknown;
  taskId?: string;
  downloadAudio(outputPath?: string): Promise<string>;
}

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, options: { status?: number; code?: string } = {}) {
    super(message);
    this.name = 'ApiError';
    if (options.status !== undefined) {
      this.status = options.status;
    }
    if (options.code !== undefined) {
      this.code = options.code;
    }
  }
}