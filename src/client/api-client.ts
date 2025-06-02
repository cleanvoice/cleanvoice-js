import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  CleanvoiceConfig,
  CreateEditRequest,
  CreateEditResponse,
  RetrieveEditResponse,
  ApiError,
} from '../types';

/**
 * Base API client for Cleanvoice API
 */
export class ApiClient {
  private axios: AxiosInstance;
  private apiKey: string;

  constructor(config: CleanvoiceConfig) {
    this.apiKey = config.apiKey;

    this.axios = axios.create({
      baseURL: config.baseUrl || 'https://api.cleanvoice.ai/v2',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Check authentication by calling the account endpoint
   */
  async checkAuth(): Promise<unknown> {
    try {
      const response = await this.axios.get('/account');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new edit job
   */
  async createEdit(request: CreateEditRequest): Promise<CreateEditResponse> {
    try {
      const response: AxiosResponse<CreateEditResponse> = await this.axios.post(
        '/edits',
        request
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieve edit status and results
   */
  async retrieveEdit(editId: string): Promise<RetrieveEditResponse> {
    try {
      const response: AxiosResponse<RetrieveEditResponse> =
        await this.axios.get(`/edits/${editId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle API errors and convert them to a consistent format
   */
  private handleApiError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as { message?: string; error?: string };

      let message = 'An API error occurred';
      if (data && typeof data === 'object') {
        message = data.message || data.error || message;
      }

      return {
        message,
        status,
        code: `HTTP_${status}`,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error: No response from server',
        code: 'NETWORK_ERROR',
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'Unknown error occurred',
        code: 'UNKNOWN_ERROR',
      };
    }
  }
} 