/**
 * Configuration options for audio processing
 */
export interface ProcessingConfig {
  /** If true, indicates that the input is a video file */
  video?: boolean;
  /** Send an email to your account with the edited file(s) */
  send_email?: boolean;
  /** Identify and remove long silences */
  long_silences?: boolean;
  /** Identify and remove stutters */
  stutters?: boolean;
  /** Identify and remove filler sounds */
  fillers?: boolean;
  /** Identify and remove mouth sounds */
  mouth_sounds?: boolean;
  /** Identify and remove hesitations */
  hesitations?: boolean;
  /** Mute specified segments instead of cutting them */
  muted?: boolean;
  /** Remove background noise */
  remove_noise?: boolean;
  /** Avoids removing or editing sections with music */
  keep_music?: boolean;
  /** Reduce the loudness of breath sounds */
  breath?: boolean | string;
  /** Normalize audio levels */
  normalize?: boolean;
  /** Apply automatic EQ adjustments (Legacy) */
  autoeq?: boolean;
  /** Studio sound algorithm selection */
  studio_sound?: string | boolean;
  /** Loudness level (in LUFS) below which segments are muted */
  mute_lufs?: number;
  /** Target loudness level (in LUFS) for the audio */
  target_lufs?: number;
  /** The format to export the edited audio in */
  export_format?: 'auto' | 'mp3' | 'wav' | 'flac' | 'm4a';
  /** Transcribe the audio to text */
  transcription?: boolean;
  /** Provide a summary of the audio content */
  summarize?: boolean;
  /** Optimize content for social media sharing */
  social_content?: boolean;
  /** Export timestamps of edits */
  export_timestamps?: boolean;
  /** User-provided S3 link where results are uploaded */
  signed_url?: string;
  /** Mix multi-track files into one */
  merge?: boolean;
}

/**
 * Input configuration for the edit request
 */
export interface EditInput {
  /** Array of URL strings containing audio files */
  files: string[];
  /** Processing configuration */
  config: ProcessingConfig;
}

/**
 * Request body for creating an edit
 */
export interface CreateEditRequest {
  input: EditInput;
}

/**
 * Response from creating an edit
 */
export interface CreateEditResponse {
  /** Unique identifier for the edit */
  id: string;
}

/**
 * Edit status values
 */
export type EditStatus = 'PENDING' | 'STARTED' | 'SUCCESS' | 'RETRY' | 'FAILURE';

/**
 * Statistics about the edit process
 */
export interface EditStatistics {
  BREATH?: number;
  DEADAIR?: number;
  STUTTERING?: number;
  MOUTH_SOUND?: number;
  FILLER_SOUND?: number;
}

/**
 * Chapter information for summarization
 */
export interface Chapter {
  /** Start time in seconds */
  start: number;
  /** Chapter title */
  title: string;
}

/**
 * Summarization result
 */
export interface Summarization {
  /** Title of the content */
  title: string;
  /** Main summary */
  summary: string;
  /** Chapter breakdowns */
  chapters: Chapter[];
  /** Array of summaries */
  summaries: string[];
  /** Key learnings from the content */
  key_learnings: string;
  /** Summary of the summary */
  summary_of_summary: string;
  /** Episode description */
  episode_description: string;
}

/**
 * Word-level transcription data
 */
export interface TranscriptionWord {
  /** Word ID */
  id: number;
  /** End time */
  end: number;
  /** Word text */
  text: string;
  /** Start time */
  start: number;
}

/**
 * Paragraph-level transcription data
 */
export interface TranscriptionParagraph {
  /** Paragraph ID */
  id: number;
  /** End time */
  end: number;
  /** Start time */
  start: number;
  /** Speaker identifier */
  speaker: string;
}

/**
 * Detailed transcription with word and paragraph data
 */
export interface DetailedTranscription {
  /** Word-level data */
  words: TranscriptionWord[];
  /** Paragraph-level data */
  paragraphs: TranscriptionParagraph[];
}

/**
 * Simple paragraph transcription
 */
export interface SimpleTranscriptionParagraph {
  /** End time */
  end: number;
  /** Paragraph text */
  text: string;
  /** Start time */
  start: number;
}

/**
 * Transcription result
 */
export interface Transcription {
  /** Simple paragraph format */
  paragraphs: SimpleTranscriptionParagraph[];
  /** Detailed transcription with words and speakers */
  transcription: DetailedTranscription;
}

/**
 * Complete edit result
 */
export interface EditResult {
  /** Whether input was video */
  video: boolean;
  /** Generated filename */
  filename: string;
  /** Edit statistics */
  statistics: EditStatistics;
  /** Download URL for processed audio */
  download_url: string;
  /** Summarization results if requested */
  summarization?: Summarization;
  /** Transcription results if requested */
  transcription?: Transcription;
  /** Social content if requested */
  social_content: unknown[];
  /** Merged audio URLs if applicable */
  merged_audio_url: string[];
  /** Timestamp marker URLs if requested */
  timestamps_markers_urls: string[];
}

/**
 * Progress data when processing is in progress
 */
export interface ProcessingProgress {
  /** Percentage completed (0-100) */
  done: number;
  /** Total (always 100) */
  total: number;
  /** Current processing stage */
  state: string;
  /** Phase number */
  phase: number;
  /** Step number */
  step: number;
  /** Substep number */
  substep: number;
  /** Job name/identifier */
  job_name: string;
}

/**
 * Response from retrieving an edit
 */
export interface RetrieveEditResponse {
  /** Current status of the edit */
  status: EditStatus;
  /** Either processing progress (when in progress) or final results (when SUCCESS) */
  result?: ProcessingProgress | EditResult;
  /** Task ID */
  task_id: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (data: {
  status: EditStatus;
  progress: ProcessingProgress | undefined;
  editId: string;
}) => void;

/**
 * Polling configuration options
 */
export interface PollingConfig {
  /** Interval between polls in milliseconds (default: 5000) */
  interval?: number;
  /** Maximum number of polling attempts (default: 60) */
  maxAttempts?: number;
  /** Callback function called on each status update */
  onProgress?: ProgressCallback;
  /** Whether to log progress to console (default: false) */
  logProgress?: boolean;
}

/**
 * Configuration for the Cleanvoice SDK
 */
export interface CleanvoiceConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API (optional, defaults to official API) */
  baseUrl?: string;
  /** Timeout for requests in milliseconds */
  timeout?: number;
}

/**
 * Simplified response format for the main process method
 */
export interface ProcessResult {
  /** Processed audio information */
  audio: {
    /** URL to download the processed audio */
    url: string;
    /** Original filename */
    filename: string;
    /** Processing statistics */
    statistics: EditStatistics;
  };
  /** Transcription data (if requested) */
  transcript?: {
    /** Full transcription text */
    text: string;
    /** Paragraph-level transcription */
    paragraphs: SimpleTranscriptionParagraph[];
    /** Detailed word-level transcription */
    detailed: DetailedTranscription;
    /** Summary (if requested) */
    summary?: string;
    /** Title (if summarization was requested) */
    title?: string;
    /** Chapters (if summarization was requested) */
    chapters?: Chapter[];
  };
}

/**
 * Error response from the API
 */
export interface ApiError {
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** HTTP status code */
  status?: number;
} 