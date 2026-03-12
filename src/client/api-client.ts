import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import {
  AccountInfo,
  ApiError,
  CleanvoiceConfig,
  CreateEditRequest,
  CreateEditResponse,
  RetrieveEditResponse,
} from '../types';

const DEFAULT_V2_BASE_URL = 'https://api.cleanvoice.ai/v2';
const DEFAULT_V1_BASE_URL = 'https://api.cleanvoice.ai/v1';
const USER_AGENT = 'cleanvoice-js-sdk/3.0.0';
const DEFAULT_MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const NON_IDEMPOTENT_RETRYABLE_STATUS_CODES = new Set([429, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['DELETE', 'GET', 'HEAD', 'OPTIONS']);
const DEFAULT_RETRY_BASE_DELAY_MS = 500;
const DEFAULT_RETRY_MAX_DELAY_MS = 2000;

export class ApiClient {
  private readonly axios: AxiosInstance;
  private readonly uploadAxios: AxiosInstance;
  private readonly config: CleanvoiceConfig;

  constructor(config: CleanvoiceConfig) {
    this.config = config;

    this.axios = axios.create({
      baseURL: this.resolveV2BaseUrl(),
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
        'User-Agent': USER_AGENT,
      },
    });

    this.uploadAxios = axios.create({
      timeout: 300000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      headers: {
        'User-Agent': USER_AGENT,
      },
    });
  }

  private resolveV2BaseUrl(): string {
    return (this.config.baseUrl || DEFAULT_V2_BASE_URL).replace(/\/$/, '');
  }

  private resolveV1BaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl.replace(/\/v2(?=\/?$)/, '/v1').replace(/\/$/, '');
    }

    return DEFAULT_V1_BASE_URL;
  }

  private shouldRetryStatus(method: string, statusCode: number): boolean {
    if (IDEMPOTENT_METHODS.has(method.toUpperCase())) {
      return RETRYABLE_STATUS_CODES.has(statusCode);
    }

    return NON_IDEMPOTENT_RETRYABLE_STATUS_CODES.has(statusCode);
  }

  private getRetryDelayMs(retryCount: number): number {
    return Math.min(
      DEFAULT_RETRY_BASE_DELAY_MS * 2 ** Math.max(retryCount - 1, 0),
      DEFAULT_RETRY_MAX_DELAY_MS
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableTransportError(method: string, error: AxiosError): boolean {
    const isIdempotent = IDEMPOTENT_METHODS.has(method.toUpperCase());
    const errorCode = error.code || '';
    const retryableCodes = isIdempotent
      ? new Set(['ECONNABORTED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ERR_NETWORK'])
      : new Set(['ECONNABORTED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT']);

    if (retryableCodes.has(errorCode)) {
      return true;
    }

    return !error.response && Boolean(error.request);
  }

  private handleApiError(error: AxiosError): ApiError {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as
        | { message?: string; error?: string; code?: string }
        | undefined;

      return new ApiError(
        data?.message || data?.error || `HTTP ${status}`,
        {
          status,
          code: data?.code || `HTTP_${status}`,
        }
      );
    }

    if (error.request) {
      return new ApiError('Network error: No response from server', {
        code: error.code || 'NETWORK_ERROR',
      });
    }

    return new ApiError(error.message || 'Unknown error occurred', {
      code: error.code || 'UNKNOWN_ERROR',
    });
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    config: AxiosRequestConfig = {},
    maxRetries: number = DEFAULT_MAX_RETRIES
  ): Promise<T> {
    let retryCount = 0;

    while (true) {
      try {
        const response: AxiosResponse<T> = await this.axios.request<T>({
          method,
          url,
          ...config,
        });
        return response.data;
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          throw error;
        }

        if (
          retryCount < maxRetries &&
          error.response &&
          this.shouldRetryStatus(method, error.response.status)
        ) {
          retryCount += 1;
          await this.sleep(this.getRetryDelayMs(retryCount));
          continue;
        }

        if (
          retryCount < maxRetries &&
          this.isRetryableTransportError(method, error)
        ) {
          retryCount += 1;
          await this.sleep(this.getRetryDelayMs(retryCount));
          continue;
        }

        throw this.handleApiError(error);
      }
    }
  }

  async checkAuth(): Promise<AccountInfo> {
    const response = await this.request<AccountInfo & { meta?: Record<string, unknown> }>(
      'GET',
      '/account',
      { baseURL: this.resolveV1BaseUrl() },
      DEFAULT_MAX_RETRIES
    );
    return {
      credit: response.credit,
    };
  }

  async createEdit(request: CreateEditRequest): Promise<CreateEditResponse> {
    return this.request<CreateEditResponse>('POST', '/edits', { data: request });
  }

  async retrieveEdit(editId: string): Promise<RetrieveEditResponse> {
    return this.request<RetrieveEditResponse>('GET', `/edits/${editId}`);
  }

  async getSignedUploadUrl(filename: string): Promise<string> {
    const response = await this.request<{ signedUrl: string }>(
      'POST',
      `/upload?filename=${encodeURIComponent(filename)}`
    );
    return response.signedUrl;
  }

  async uploadFile(filePath: string, signedUrl: string): Promise<void> {
    try {
      const fileInfo = await stat(filePath);
      await this.uploadAxios.put(signedUrl, createReadStream(filePath), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(fileInfo.size),
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw this.handleApiError(error);
      }

      throw new ApiError(
        error instanceof Error ? `File upload failed: ${error.message}` : 'File upload failed'
      );
    }
  }
}

export function isTransientApiError(error: ApiError): boolean {
  if (error.status !== undefined) {
    return RETRYABLE_STATUS_CODES.has(error.status);
  }

  const normalizedMessage = error.message.toLowerCase();
  return [
    'connection',
    'network',
    'request failed',
    'temporarily unavailable',
    'timed out',
    'timeout',
    'econnreset',
  ].some((token) => normalizedMessage.includes(token));
}