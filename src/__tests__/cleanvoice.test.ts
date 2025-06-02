import { Cleanvoice } from '../cleanvoice';
import { ApiClient } from '../client/api-client';
import * as fileHandler from '../utils/file-handler';

// Mock the dependencies
jest.mock('../client/api-client');
jest.mock('../utils/file-handler');

const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const mockedFileHandler = fileHandler as jest.Mocked<typeof fileHandler>;

describe('Cleanvoice SDK', () => {
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = {
      createEdit: jest.fn(),
      retrieveEdit: jest.fn(),
      checkAuth: jest.fn(),
    } as unknown as jest.Mocked<ApiClient>;
    
    MockedApiClient.mockImplementation(() => mockApiClient);
    mockedFileHandler.validateConfig = jest.fn();
    mockedFileHandler.normalizeFileInput = jest.fn();
    mockedFileHandler.isValidVideoFile = jest.fn();
  });

  describe('constructor', () => {
    it('should initialize with valid API key', () => {
      const cv = new Cleanvoice({ apiKey: 'test-key' });
      expect(cv).toBeInstanceOf(Cleanvoice);
      expect(MockedApiClient).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });

    it('should throw error for missing API key', () => {
      expect(() => new Cleanvoice({ apiKey: '' })).toThrow('API key is required');
    });
  });

  describe('process', () => {
    let cv: Cleanvoice;

    beforeEach(() => {
      cv = new Cleanvoice({ apiKey: 'test-key' });
    });

    it('should process audio file successfully', async () => {
      // Setup mocks
      mockedFileHandler.normalizeFileInput.mockResolvedValue('https://example.com/audio.mp3');
      mockedFileHandler.isValidVideoFile.mockReturnValue(false);
      
      mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
      mockApiClient.retrieveEdit.mockResolvedValue({
        status: 'SUCCESS',
        task_id: 'task-123',
        result: {
          video: false,
          filename: 'processed.mp3',
          statistics: { FILLER_SOUND: 5, BREATH: 10 },
          download_url: 'https://example.com/processed.mp3',
          social_content: [],
          merged_audio_url: [],
          timestamps_markers_urls: [],
        },
      });

      const result = await cv.process('https://example.com/audio.mp3', {
        fillers: true,
        normalize: true,
      });

      expect(result).toEqual({
        audio: {
          url: 'https://example.com/processed.mp3',
          filename: 'processed.mp3',
          statistics: { FILLER_SOUND: 5, BREATH: 10 },
        },
      });

      expect(mockedFileHandler.validateConfig).toHaveBeenCalledWith({
        fillers: true,
        normalize: true,
        video: false,
      });
      expect(mockedFileHandler.normalizeFileInput).toHaveBeenCalledWith('https://example.com/audio.mp3');
      expect(mockApiClient.createEdit).toHaveBeenCalledWith({
        input: {
          files: ['https://example.com/audio.mp3'],
          config: { fillers: true, normalize: true, video: false },
        },
      });
    });

    it('should process with transcription and summarization', async () => {
      mockedFileHandler.normalizeFileInput.mockResolvedValue('https://example.com/audio.mp3');
      mockedFileHandler.isValidVideoFile.mockReturnValue(false);
      
      mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
      mockApiClient.retrieveEdit.mockResolvedValue({
        status: 'SUCCESS',
        task_id: 'task-123',
        result: {
          video: false,
          filename: 'processed.mp3',
          statistics: { FILLER_SOUND: 5 },
          download_url: 'https://example.com/processed.mp3',
          transcription: {
            paragraphs: [
              { start: 0, end: 5, text: 'Hello world' },
              { start: 5, end: 10, text: 'This is a test' },
            ],
            transcription: {
              words: [
                { id: 0, start: 0, end: 1, text: 'Hello' },
                { id: 1, start: 1, end: 2, text: 'world' },
              ],
              paragraphs: [
                { id: 0, start: 0, end: 10, speaker: 'SPEAKER_01' },
              ],
            },
          },
          summarization: {
            title: 'Test Audio',
            summary: 'This is a test summary',
            chapters: [{ start: 0, title: 'Introduction' }],
            summaries: ['Summary 1'],
            key_learnings: 'Key learnings',
            summary_of_summary: 'Brief summary',
            episode_description: 'Episode description',
          },
          social_content: [],
          merged_audio_url: [],
          timestamps_markers_urls: [],
        },
      });

      const result = await cv.process('https://example.com/audio.mp3', {
        transcription: true,
        summarize: true,
      });

      expect(result.transcript).toEqual({
        text: 'Hello world This is a test',
        paragraphs: [
          { start: 0, end: 5, text: 'Hello world' },
          { start: 5, end: 10, text: 'This is a test' },
        ],
        detailed: {
          words: [
            { id: 0, start: 0, end: 1, text: 'Hello' },
            { id: 1, start: 1, end: 2, text: 'world' },
          ],
          paragraphs: [
            { id: 0, start: 0, end: 10, speaker: 'SPEAKER_01' },
          ],
        },
        summary: 'This is a test summary',
        title: 'Test Audio',
        chapters: [{ start: 0, title: 'Introduction' }],
      });
    });

    it('should handle processing failures', async () => {
      mockedFileHandler.normalizeFileInput.mockResolvedValue('https://example.com/audio.mp3');
      mockedFileHandler.isValidVideoFile.mockReturnValue(false);
      
      mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
      mockApiClient.retrieveEdit.mockResolvedValue({
        status: 'FAILURE',
        task_id: 'task-123',
      });

      await expect(cv.process('https://example.com/audio.mp3')).rejects.toThrow('Edit processing failed');
    });

    it('should handle validation errors', async () => {
      mockedFileHandler.validateConfig.mockImplementation(() => {
        throw new Error('Invalid config');
      });

      await expect(cv.process('https://example.com/audio.mp3', {})).rejects.toThrow('Invalid config');
    });
  });

  describe('createEdit', () => {
    let cv: Cleanvoice;

    beforeEach(() => {
      cv = new Cleanvoice({ apiKey: 'test-key' });
    });

    it('should create edit and return ID', async () => {
      mockedFileHandler.normalizeFileInput.mockResolvedValue('https://example.com/audio.mp3');
      mockedFileHandler.isValidVideoFile.mockReturnValue(false);
      mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });

      const editId = await cv.createEdit('https://example.com/audio.mp3', { fillers: true });

      expect(editId).toBe('edit-123');
      expect(mockApiClient.createEdit).toHaveBeenCalledWith({
        input: {
          files: ['https://example.com/audio.mp3'],
          config: { fillers: true, video: false },
        },
      });
    });
  });

  describe('getEdit', () => {
    let cv: Cleanvoice;

    beforeEach(() => {
      cv = new Cleanvoice({ apiKey: 'test-key' });
    });

    it('should retrieve edit status', async () => {
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

      mockApiClient.retrieveEdit.mockResolvedValue(mockResponse);

      const result = await cv.getEdit('edit-123');

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.retrieveEdit).toHaveBeenCalledWith('edit-123');
    });
  });

  describe('checkAuth', () => {
    let cv: Cleanvoice;

    beforeEach(() => {
      cv = new Cleanvoice({ apiKey: 'test-key' });
    });

    it('should check authentication', async () => {
      const mockAccountData = { user: 'test', credits: 100 };
      mockApiClient.checkAuth.mockResolvedValue(mockAccountData);

      const result = await cv.checkAuth();

      expect(result).toEqual(mockAccountData);
      expect(mockApiClient.checkAuth).toHaveBeenCalled();
    });
  });
}); 