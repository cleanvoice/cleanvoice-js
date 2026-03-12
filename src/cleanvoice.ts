import { ApiClient, isTransientApiError } from './client/api-client';
import {
  downloadFile,
  isValidVideoFile,
  normalizeFileInput,
  signedUrlToPublicUrl,
  validateConfig,
} from './utils/file-handler';
import {
  AccountInfo,
  ApiError,
  CleanvoiceConfig,
  DownloadableMedia,
  EditOptions,
  EditResult,
  PollingConfig,
  ProgressCallbackData,
  ProcessingConfig,
  ProcessOptions,
  ProcessResult,
  RetrieveEditResponse,
  TranscriptResult,
} from './types';

export class Cleanvoice {
  private readonly apiClient: ApiClient;

  constructor(config: CleanvoiceConfig) {
    if (!config.apiKey) {
      throw new ApiError('API key is required');
    }

    this.apiClient = new ApiClient(config);
  }

  static fromEnv(options: {
    apiKeyEnv?: string;
    baseUrlEnv?: string;
    timeoutEnv?: string;
  } = {}): Cleanvoice {
    const {
      apiKeyEnv = 'CLEANVOICE_API_KEY',
      baseUrlEnv = 'CLEANVOICE_BASE_URL',
      timeoutEnv = 'CLEANVOICE_TIMEOUT',
    } = options;

    const apiKey = process.env[apiKeyEnv];
    if (!apiKey) {
      throw new ApiError(`Environment variable ${apiKeyEnv} is required`);
    }

    const timeoutValue = process.env[timeoutEnv];
    const timeout = timeoutValue ? Number(timeoutValue) : undefined;
    if (timeoutValue && Number.isNaN(timeout)) {
      throw new ApiError(`Environment variable ${timeoutEnv} must be a valid number`);
    }

    const config: CleanvoiceConfig = { apiKey };
    const baseUrl = process.env[baseUrlEnv];
    if (baseUrl) {
      config.baseUrl = baseUrl;
    }
    if (timeout !== undefined) {
      config.timeout = timeout;
    }

    return new Cleanvoice(config);
  }

  async process(
    fileInput: string,
    config: ProcessingConfig = {},
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    try {
      const normalizedConfig = this.buildProcessingConfig(fileInput, config);
      const fileUrl = await normalizeFileInput(fileInput, this.apiClient);
      const editResponse = await this.apiClient.createEdit(this.buildCreateEditRequest(
        fileUrl,
        normalizedConfig,
        options
      ));

      const result = await this.pollForCompletion(editResponse.id, options.polling);
      const transformed = this.transformResult(result);

      if (options.download || options.outputPath) {
        await transformed.downloadAudio(options.outputPath);
      }

      return transformed;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(error.message);
      }
      throw new ApiError('An unknown error occurred during processing');
    }
  }

  async createEdit(
    fileInput: string,
    config: ProcessingConfig = {},
    options: EditOptions = {}
  ): Promise<string> {
    try {
      const normalizedConfig = this.buildProcessingConfig(fileInput, config);
      const fileUrl = await normalizeFileInput(fileInput, this.apiClient);

      const response = await this.apiClient.createEdit(this.buildCreateEditRequest(
        fileUrl,
        normalizedConfig,
        options
      ));

      return response.id;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(error.message);
      }
      throw new ApiError('An unknown error occurred while creating edit');
    }
  }

  async getEdit(editId: string): Promise<RetrieveEditResponse> {
    try {
      return await this.apiClient.retrieveEdit(editId);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(error.message);
      }
      throw new ApiError('An unknown error occurred while retrieving edit');
    }
  }

  async uploadFile(filePath: string, filename?: string): Promise<string> {
    const uploadFilename = filename || this.getFilename(filePath);
    const signedUrl = await this.apiClient.getSignedUploadUrl(uploadFilename);
    await this.apiClient.uploadFile(filePath, signedUrl);
    return signedUrlToPublicUrl(signedUrl);
  }

  async downloadFile(url: string, outputPath?: string): Promise<string> {
    return downloadFile(url, outputPath);
  }

  async processAndDownload(
    fileInput: string,
    outputPath?: string,
    config: ProcessingConfig = {},
    options: Omit<ProcessOptions, 'outputPath' | 'download'> = {}
  ): Promise<[ProcessResult, string]> {
    const processOptions: ProcessOptions = {
      ...options,
      download: true,
    };
    if (outputPath !== undefined) {
      processOptions.outputPath = outputPath;
    }

    const result = await this.process(fileInput, config, processOptions);
    const localPath = result.audio.localPath;

    if (!localPath) {
      throw new ApiError('Processed media was not downloaded');
    }

    return [result, localPath];
  }

  async checkAuth(): Promise<AccountInfo> {
    try {
      return await this.apiClient.checkAuth();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(error.message);
      }
      throw new ApiError('Authentication check failed');
    }
  }

  private async pollForCompletion(
    editId: string,
    pollingConfig: PollingConfig = {}
  ): Promise<RetrieveEditResponse> {
    const maxAttempts = pollingConfig.maxAttempts ?? 60;
    const fixedInterval = pollingConfig.interval;
    const initialDelay = fixedInterval ?? pollingConfig.initialDelay ?? 2000;
    const successResultGraceAttempts = pollingConfig.successResultGraceAttempts ?? 5;
    const maxTransientErrors = pollingConfig.maxTransientErrors ?? 5;
    let attempts = 0;
    let delay = initialDelay;
    let missingSuccessResultAttempts = 0;
    let transientErrors = 0;

    while (attempts < maxAttempts) {
      let response: RetrieveEditResponse;
      try {
        response = await this.apiClient.retrieveEdit(editId);
        transientErrors = 0;
      } catch (error) {
        if (!(error instanceof ApiError) || !isTransientApiError(error)) {
          throw error;
        }

        transientErrors += 1;
        if (transientErrors >= maxTransientErrors) {
          const errorOptions: { status?: number; code?: string } = {};
          if (error.status !== undefined) {
            errorOptions.status = error.status;
          }
          if (error.code !== undefined) {
            errorOptions.code = error.code;
          }
          throw new ApiError(
            `Polling failed after ${transientErrors} transient transport errors: ${error.message}`,
            errorOptions
          );
        }

        await this.sleep(Math.min(delay, 5000));
        continue;
      }

      this.emitProgress(pollingConfig, response, editId, attempts + 1);

      if (response.status === 'SUCCESS') {
        if (!response.result || !('download_url' in response.result)) {
          missingSuccessResultAttempts += 1;
          if (missingSuccessResultAttempts >= successResultGraceAttempts) {
            throw new ApiError(
              'Edit completed but the result payload never became available'
            );
          }

          await this.sleep(Math.min(delay, 5000));
          attempts += 1;
          continue;
        }

        return response;
      }

      if (response.status === 'FAILURE') {
        throw new ApiError(this.buildFailureMessage(editId, response));
      }

      await this.sleep(delay);
      attempts++;
      delay = fixedInterval ?? Math.min(delay * 1.5, 30000);
    }

    throw new ApiError('Edit processing timeout - maximum polling attempts reached');
  }

  private transformResult(response: RetrieveEditResponse): ProcessResult {
    if (!response.result) {
      throw new ApiError('Edit result not available');
    }

    if (!('download_url' in response.result)) {
      throw new ApiError('Edit is still in progress, cannot transform to final result');
    }

    const editResult = response.result as EditResult;
    const summarization =
      editResult.summarization && !Array.isArray(editResult.summarization)
        ? editResult.summarization
        : undefined;
    const transcription =
      editResult.transcription && !Array.isArray(editResult.transcription)
        ? editResult.transcription
        : undefined;

    const media = this.createDownloadableMedia(editResult);
    let transcriptResult: TranscriptResult | undefined;

    if (transcription) {
      transcriptResult = {
        text: transcription.paragraphs.map((paragraph) => paragraph.text).join(' '),
        paragraphs: transcription.paragraphs,
        detailed: transcription.transcription,
      };
      if (summarization?.summary !== undefined) {
        transcriptResult.summary = summarization.summary;
      }
      if (summarization?.title !== undefined) {
        transcriptResult.title = summarization.title;
      }
      if (summarization?.chapters !== undefined) {
        transcriptResult.chapters = summarization.chapters;
      }
      if (summarization !== undefined) {
        transcriptResult.summarization = summarization;
      }
    }

    const result: ProcessResult = {
      audio: media,
      media,
      video: editResult.video,
      isVideo: editResult.video,
      socialContent: editResult.social_content || [],
      taskId: response.task_id,
      downloadAudio: async (outputPath?: string) => media.download(outputPath),
    };

    if (transcriptResult) {
      result.transcript = transcriptResult;
    }
    if (summarization) {
      result.summarization = summarization;
    }
    if (editResult.timestamps_markers_urls !== undefined) {
      result.timestampsMarkersUrls = editResult.timestamps_markers_urls;
    }
    if (editResult.waveform_result !== undefined) {
      result.waveformResult = editResult.waveform_result;
    }

    return result;
  }

  private createDownloadableMedia(editResult: EditResult): DownloadableMedia {
    const media: DownloadableMedia = {
      url: editResult.download_url,
      filename: editResult.filename,
      statistics: editResult.statistics,
      download: async (outputPath?: string) => {
        const localPath = await downloadFile(editResult.download_url, outputPath);
        media.localPath = localPath;
        return localPath;
      },
    };

    if (editResult.merged_audio_url !== undefined) {
      media.mergedAudioUrl = editResult.merged_audio_url;
    }
    if (editResult.timestamps_markers_urls !== undefined) {
      media.timestampsMarkersUrls = editResult.timestamps_markers_urls;
    }
    if (editResult.waveform_result !== undefined) {
      media.waveformResult = editResult.waveform_result;
    }

    return media;
  }

  private emitProgress(
    pollingConfig: PollingConfig,
    response: RetrieveEditResponse,
    editId: string,
    attempt: number
  ): void {
    const progress =
      response.result && !('download_url' in response.result) ? response.result : undefined;

    if (pollingConfig.logProgress) {
      const percentage =
        progress && typeof progress.done === 'number' ? ` ${progress.done}%` : '';
      // eslint-disable-next-line no-console
      console.log(`Cleanvoice ${editId}: ${response.status}${percentage}`);
    }

    if (!pollingConfig.onProgress) {
      return;
    }

    try {
      const payload: ProgressCallbackData = {
        status: response.status,
        editId,
        attempt,
      } as ProgressCallbackData;

      if (progress !== undefined) {
        payload.progress = progress;
      }
      if (response.result !== undefined) {
        payload.result = response.result;
      }

      pollingConfig.onProgress(payload);
    } catch {
      // Ignore callback failures so polling keeps running.
    }
  }

  private buildProcessingConfig(
    fileInput: string,
    config: ProcessingConfig
  ): ProcessingConfig {
    const normalizedConfig: ProcessingConfig = { ...config };

    if (
      normalizedConfig.sound_studio !== undefined &&
      normalizedConfig.studio_sound === undefined
    ) {
      normalizedConfig.studio_sound = normalizedConfig.sound_studio;
      delete normalizedConfig.sound_studio;
    }

    if (normalizedConfig.social_content) {
      normalizedConfig.summarize = true;
    }

    if (normalizedConfig.summarize) {
      normalizedConfig.transcription = true;
    }

    const detectedVideo = isValidVideoFile(fileInput);
    if (detectedVideo) {
      if (normalizedConfig.video === false) {
        // eslint-disable-next-line no-console
        console.warn(
          'Video input detected. Overriding video=false so the SDK returns the processed video file.'
        );
      } else if (normalizedConfig.video === undefined) {
        // eslint-disable-next-line no-console
        console.warn(
          'Video input detected. The SDK will process this file as video and return the processed video file.'
        );
      }
      normalizedConfig.video = true;
    } else if (normalizedConfig.video === undefined) {
      normalizedConfig.video = false;
    }

    validateConfig(normalizedConfig);
    return normalizedConfig;
  }

  private buildFailureMessage(editId: string, response: RetrieveEditResponse): string {
    const result = response.result;

    if (result && !('download_url' in result)) {
      const detail = result.state || result.job_name;
      if (detail) {
        return `Edit processing failed for ${editId}: ${detail}`;
      }
    }

    return `Edit processing failed for ${editId}`;
  }

  private buildCreateEditRequest(
    fileUrl: string,
    config: ProcessingConfig,
    options: EditOptions
  ): { input: { files: string[]; config: ProcessingConfig; template_id?: number; upload_type?: string } } {
    const input: {
      files: string[];
      config: ProcessingConfig;
      template_id?: number;
      upload_type?: string;
    } = {
      files: [fileUrl],
      config,
    };

    if (options.templateId !== undefined) {
      input.template_id = options.templateId;
    }
    if (options.uploadType !== undefined) {
      input.upload_type = options.uploadType;
    }

    return { input };
  }

  private getFilename(filePath: string): string {
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1] || 'upload';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}