import axios, { AxiosError } from 'axios';
import { ApiClient } from '../client/api-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    apiClient = new ApiClient({
      apiKey: 'test-api-key',
    });
  });

  describe('constructor', () => {
    it('should create axios instance with default config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.cleanvoice.ai/v2',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
      });
    });

    it('should create axios instance with custom config', () => {
      new ApiClient({
        apiKey: 'custom-key',
        baseUrl: 'https://custom.api.com',
        timeout: 60000,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom.api.com',
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'custom-key',
        },
      });
    });

    it('should set up response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('checkAuth', () => {
    it('should call account endpoint and return data', async () => {
      const mockAccountData = { user: 'test', credits: 100 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockAccountData });

      const result = await apiClient.checkAuth();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/account');
      expect(result).toEqual(mockAccountData);
    });

    it('should throw error on request failure', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(apiClient.checkAuth()).rejects.toThrow('Network error');
    });
  });

  describe('createEdit', () => {
    const mockRequest = {
      input: {
        files: ['https://example.com/audio.mp3'],
        config: { fillers: true },
      },
    };

    it('should create edit and return response', async () => {
      const mockResponse = { id: 'edit-123' };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.createEdit(mockRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/edits', mockRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on request failure', async () => {
      const error = new Error('API error');
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(apiClient.createEdit(mockRequest)).rejects.toThrow('API error');
    });
  });

  describe('retrieveEdit', () => {
    it('should retrieve edit status and return response', async () => {
      const mockResponse = {
        status: 'SUCCESS' as const,
        task_id: 'task-123',
        result: {
          video: false,
          filename: 'test.mp3',
          statistics: {},
          download_url: 'https://example.com/test.mp3',
          social_content: [],
          merged_audio_url: [],
          timestamps_markers_urls: [],
        },
      };
      
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.retrieveEdit('edit-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/edits/edit-123');
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on request failure', async () => {
      const error = new Error('Not found');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(apiClient.retrieveEdit('edit-123')).rejects.toThrow('Not found');
    });
  });

  describe('error handling', () => {
    let errorHandler: (error: AxiosError) => Promise<never>;

    beforeEach(() => {
      // Extract the error handler from the interceptor call
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
      errorHandler = interceptorCall[1];
    });

    it('should handle HTTP error responses', async () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      } as AxiosError;

      const result = errorHandler(axiosError);

      await expect(result).rejects.toEqual({
        message: 'Unauthorized',
        status: 401,
        code: 'HTTP_401',
      });
    });

    it('should handle HTTP error with different error format', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { error: 'Bad request' },
        },
      } as AxiosError;

      const result = errorHandler(axiosError);

      await expect(result).rejects.toEqual({
        message: 'Bad request',
        status: 400,
        code: 'HTTP_400',
      });
    });

    it('should handle HTTP error with no message', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: {},
        },
      } as AxiosError;

      const result = errorHandler(axiosError);

      await expect(result).rejects.toEqual({
        message: 'An API error occurred',
        status: 500,
        code: 'HTTP_500',
      });
    });

    it('should handle network errors', async () => {
      const axiosError = {
        request: {},
      } as AxiosError;

      const result = errorHandler(axiosError);

      await expect(result).rejects.toEqual({
        message: 'Network error: No response from server',
        code: 'NETWORK_ERROR',
      });
    });

    it('should handle unknown errors', async () => {
      const axiosError = {
        message: 'Something went wrong',
      } as AxiosError;

      const result = errorHandler(axiosError);

      await expect(result).rejects.toEqual({
        message: 'Something went wrong',
        code: 'UNKNOWN_ERROR',
      });
    });

    it('should handle errors without message', async () => {
      const axiosError = {} as AxiosError;

      const result = errorHandler(axiosError);

      await expect(result).rejects.toEqual({
        message: 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      });
    });
  });
}); 