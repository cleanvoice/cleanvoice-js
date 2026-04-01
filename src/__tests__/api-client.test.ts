import axios, { AxiosError } from 'axios';
import { ApiClient, isTransientApiError } from '../client/api-client';
import { ApiError } from '../types';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

function createAxiosError(
  overrides: Partial<AxiosError> = {},
  config: Partial<AxiosError['config']> = {}
): AxiosError {
  return {
    name: 'AxiosError',
    message: 'Request failed',
    config: {
      headers: {},
      ...config,
    },
    isAxiosError: true,
    toJSON: () => ({}),
    ...overrides,
  } as AxiosError;
}

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockRequestClient: { request: jest.Mock };
  let mockUploadClient: { put: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockRequestClient = {
      request: jest.fn(),
    };
    mockUploadClient = {
      put: jest.fn(),
    };

    mockedAxios.create
      .mockReturnValueOnce(mockRequestClient as never)
      .mockReturnValueOnce(mockUploadClient as never);
    mockedAxios.isAxiosError.mockImplementation(
      (value: unknown): value is AxiosError => Boolean((value as AxiosError)?.isAxiosError)
    );

    apiClient = new ApiClient({
      apiKey: 'test-api-key',
    });
  });

  it('creates axios instances with expected defaults', () => {
    expect(mockedAxios.create).toHaveBeenNthCalledWith(1, {
      baseURL: 'https://api.cleanvoice.ai/v2',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
          'User-Agent': 'cleanvoice-js-sdk/3.0.2',
      },
    });
    expect(mockedAxios.create).toHaveBeenNthCalledWith(2, {
      timeout: 300000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      headers: {
        'User-Agent': 'cleanvoice-js-sdk/3.0.2',
      },
    });
  });

  it('routes auth requests to the v1 base URL', async () => {
    mockRequestClient.request.mockResolvedValue({
      data: {
        credit: {
          total: 100,
          subscription: 25,
          payg: 75,
        },
        meta: {
          send_email: true,
        },
      },
    });

    const result = await apiClient.checkAuth();

    expect(mockRequestClient.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/account',
      baseURL: 'https://api.cleanvoice.ai/v1',
    });
    expect(result).toEqual({
      credit: {
        total: 100,
        subscription: 25,
        payg: 75,
      },
    });
  });

  it('creates edits via the shared request pipeline', async () => {
    const mockRequest = {
      input: {
        files: ['https://example.com/audio.mp3'],
        config: { fillers: true },
      },
    };
    mockRequestClient.request.mockResolvedValue({ data: { id: 'edit-123' } });

    const result = await apiClient.createEdit(mockRequest);

    expect(mockRequestClient.request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/edits',
      data: mockRequest,
    });
    expect(result).toEqual({ id: 'edit-123' });
  });

  it('retries retryable HTTP failures before succeeding', async () => {
    jest.useFakeTimers();
    mockRequestClient.request
      .mockRejectedValueOnce(
        createAxiosError({
          response: {
            status: 503,
            data: { message: 'busy' },
          } as never,
        })
      )
      .mockResolvedValueOnce({ data: { id: 'edit-123' } });

    const promise = apiClient.createEdit({
      input: {
        files: ['https://example.com/audio.mp3'],
        config: {},
      },
    });

    await jest.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toEqual({ id: 'edit-123' });
    expect(mockRequestClient.request).toHaveBeenCalledTimes(2);
  });

  it('retries retryable transport failures on idempotent requests', async () => {
    jest.useFakeTimers();
    mockRequestClient.request
      .mockRejectedValueOnce(
        createAxiosError({
          code: 'ECONNRESET',
          request: {},
        })
      )
      .mockResolvedValueOnce({
        data: {
          status: 'SUCCESS',
          task_id: 'task-123',
          result: {
            video: false,
            filename: 'test.mp3',
            statistics: {},
            download_url: 'https://example.com/test.mp3',
          },
        },
      });

    const promise = apiClient.retrieveEdit('edit-123');

    await jest.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toEqual({
      status: 'SUCCESS',
      task_id: 'task-123',
      result: {
        video: false,
        filename: 'test.mp3',
        statistics: {},
        download_url: 'https://example.com/test.mp3',
      },
    });
  });

  it('does not retry ambiguous transport failures for non-idempotent requests', async () => {
    mockRequestClient.request.mockRejectedValue(
      createAxiosError({
        request: {},
      })
    );

    await expect(
      apiClient.createEdit({
        input: {
          files: ['https://example.com/audio.mp3'],
          config: {},
        },
      })
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'Network error: No response from server',
      })
    );

    expect(mockRequestClient.request).toHaveBeenCalledTimes(1);
  });

  it('returns structured ApiError instances for HTTP failures', async () => {
    mockRequestClient.request.mockRejectedValue(
      createAxiosError({
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        } as never,
      })
    );

    await expect(apiClient.retrieveEdit('edit-123')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        message: 'Unauthorized',
        status: 401,
        code: 'HTTP_401',
      })
    );
  });

  it('returns signed upload URLs', async () => {
    mockRequestClient.request.mockResolvedValue({
      data: { signedUrl: 'https://upload.example.com/file.mp3?signature=abc' },
    });

    const result = await apiClient.getSignedUploadUrl('file.mp3');

    expect(result).toBe('https://upload.example.com/file.mp3?signature=abc');
    expect(mockRequestClient.request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/upload?filename=file.mp3',
    });
  });

  it('uploads files to signed URLs', async () => {
    mockUploadClient.put.mockResolvedValue({ status: 200 });

    await apiClient.uploadFile(__filename, 'https://upload.example.com/file.mp3?signature=abc');

    const { size } = require('fs').statSync(__filename);
    expect(mockUploadClient.put).toHaveBeenCalledWith(
      'https://upload.example.com/file.mp3?signature=abc',
      expect.anything(),
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(size),
        },
      }
    );
  });

  it('classifies transient API errors', () => {
    expect(isTransientApiError(new ApiError('temporarily unavailable'))).toBe(true);
    expect(isTransientApiError(new ApiError('Unauthorized', { status: 401 }))).toBe(false);
    expect(isTransientApiError(new ApiError('Busy', { status: 503 }))).toBe(true);
  });
});
