import { ApiClient } from './client/api-client';
import { normalizeFileInput, validateConfig, isValidVideoFile } from './utils/file-handler';
import {
  CleanvoiceConfig,
  ProcessingConfig,
  ProcessResult,
  RetrieveEditResponse,
  EditResult,
} from './types';

/**
 * Main Cleanvoice SDK class
 */
export class Cleanvoice {
  private apiClient: ApiClient;

  /**
   * Initialize Cleanvoice SDK
   * @param config Configuration including API key
   */
  constructor(config: CleanvoiceConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiClient = new ApiClient(config);
  }

  /**
   * Process audio/video file with Cleanvoice AI
   * @param fileInput Local file path or URL to audio/video file
   * @param config Processing configuration options
   * @returns Promise with processed audio and transcript data
   */
  async process(
    fileInput: string,
    config: ProcessingConfig = {}
  ): Promise<ProcessResult> {
    try {
      // Validate configuration
      validateConfig(config);

      // Normalize file input to URL
      const fileUrl = await normalizeFileInput(fileInput);

      // Auto-detect video if not specified
      if (config.video === undefined) {
        config.video = isValidVideoFile(fileInput);
      }

      // Create edit request
      const editResponse = await this.apiClient.createEdit({
        input: {
          files: [fileUrl],
          config,
        },
      });

      // Poll for completion
      const result = await this.pollForCompletion(editResponse.id);

      // Transform to simplified format
      return this.transformResult(result);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred during processing');
    }
  }

  /**
   * Create an edit job and return the ID for manual polling
   * @param fileInput Local file path or URL to audio/video file
   * @param config Processing configuration options
   * @returns Edit ID for polling
   */
  async createEdit(
    fileInput: string,
    config: ProcessingConfig = {}
  ): Promise<string> {
    try {
      validateConfig(config);
      const fileUrl = await normalizeFileInput(fileInput);

      if (config.video === undefined) {
        config.video = isValidVideoFile(fileInput);
      }

      const response = await this.apiClient.createEdit({
        input: {
          files: [fileUrl],
          config,
        },
      });

      return response.id;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while creating edit');
    }
  }

  /**
   * Get the status and results of an edit job
   * @param editId The edit ID returned from createEdit
   * @returns Edit status and results
   */
  async getEdit(editId: string): Promise<RetrieveEditResponse> {
    try {
      return await this.apiClient.retrieveEdit(editId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while retrieving edit');
    }
  }

  /**
   * Check if authentication is working
   * @returns Account information
   */
  async checkAuth(): Promise<unknown> {
    try {
      return await this.apiClient.checkAuth();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Authentication check failed');
    }
  }

  /**
   * Poll for edit completion with exponential backoff
   * @param editId Edit ID to poll
   * @param maxAttempts Maximum number of polling attempts
   * @param initialDelay Initial delay in milliseconds
   * @returns Final edit result
   */
  private async pollForCompletion(
    editId: string,
    maxAttempts: number = 60,
    initialDelay: number = 2000
  ): Promise<RetrieveEditResponse> {
    let attempts = 0;
    let delay = initialDelay;

    while (attempts < maxAttempts) {
      const response = await this.apiClient.retrieveEdit(editId);

      if (response.status === 'SUCCESS') {
        return response;
      }

      if (response.status === 'FAILURE') {
        throw new Error('Edit processing failed');
      }

      // Wait before next attempt
      await this.sleep(delay);

      attempts++;
      // Exponential backoff with max delay of 30 seconds
      delay = Math.min(delay * 1.5, 30000);
    }

    throw new Error('Edit processing timeout - maximum polling attempts reached');
  }

  /**
   * Transform API response to simplified format
   * @param response API response
   * @returns Simplified result format
   */
  private transformResult(response: RetrieveEditResponse): ProcessResult {
    if (!response.result) {
      throw new Error('Edit result not available');
    }

    // Check if this is a completed result (EditResult) vs in-progress (ProcessingProgress)
    if ('download_url' in response.result) {
      // This is an EditResult (completed processing)
      const editResult = response.result as EditResult;
      
      const result: ProcessResult = {
        audio: {
          url: editResult.download_url,
          filename: editResult.filename,
          statistics: editResult.statistics,
        },
      };

      // Add transcript data if available
      if (editResult.transcription) {
        const transcript = editResult.transcription;
        
        // Combine all paragraph text for simplified access
        const fullText = transcript.paragraphs
          .map((p: { text: string }) => p.text)
          .join(' ');

        result.transcript = {
          text: fullText,
          paragraphs: transcript.paragraphs,
          detailed: transcript.transcription,
        };

        // Add summarization data if available
        if (editResult.summarization) {
          const summary = editResult.summarization;
          result.transcript.summary = summary.summary;
          result.transcript.title = summary.title;
          result.transcript.chapters = summary.chapters;
        }
      }

      return result;
    } else {
      // This is ProcessingProgress (still in progress)
      throw new Error('Edit is still in progress, cannot transform to final result');
    }
  }

  /**
   * Sleep for specified milliseconds
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
} 