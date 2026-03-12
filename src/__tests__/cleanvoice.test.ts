import { Cleanvoice } from '../cleanvoice';
import { ApiClient, isTransientApiError } from '../client/api-client';
import { ApiError } from '../types';
import * as fileHandler from '../utils/file-handler';

jest.mock('../client/api-client');
jest.mock('../utils/file-handler');

const MockedApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
const mockedIsTransientApiError = isTransientApiError as jest.MockedFunction<
  typeof isTransientApiError
>;
const mockedFileHandler = fileHandler as jest.Mocked<typeof fileHandler>;

const successResponse = {
  status: 'SUCCESS' as const,
  task_id: 'task-123',
  result: {
    video: false,
    filename: 'processed.mp3',
    statistics: { FILLER_SOUND: 5, BREATH: 10 },
    download_url: 'https://example.com/processed.mp3',
    social_content: ['clip'],
    merged_audio_url: ['https://example.com/alt.mp3'],
    timestamps_markers_urls: ['https://example.com/timestamps.json'],
    waveform_result: { peaks: [1, 2, 3] },
  },
};

describe('Cleanvoice SDK', () => {
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    mockApiClient = {
      createEdit: jest.fn(),
      retrieveEdit: jest.fn(),
      checkAuth: jest.fn(),
      getSignedUploadUrl: jest.fn(),
      uploadFile: jest.fn(),
    } as unknown as jest.Mocked<ApiClient>;

    MockedApiClient.mockImplementation(() => mockApiClient);
    mockedIsTransientApiError.mockImplementation((error: ApiError) =>
      error.message.toLowerCase().includes('timeout')
    );
    mockedFileHandler.validateConfig.mockImplementation(() => undefined);
    mockedFileHandler.normalizeFileInput.mockResolvedValue('https://example.com/audio.mp3');
    mockedFileHandler.isValidVideoFile.mockReturnValue(false);
    mockedFileHandler.downloadFile.mockResolvedValue('/tmp/output.mp3');
    mockedFileHandler.signedUrlToPublicUrl.mockImplementation(
      (signedUrl: string) => signedUrl.split('?')[0] || signedUrl
    );
  });

  afterEach(() => {
    delete process.env.CLEANVOICE_API_KEY;
    delete process.env.CLEANVOICE_BASE_URL;
    delete process.env.CLEANVOICE_TIMEOUT;
  });

  it('initializes with valid API key', () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    expect(cv).toBeInstanceOf(Cleanvoice);
    expect(MockedApiClient).toHaveBeenCalledWith({ apiKey: 'test-key' });
  });

  it('throws for missing API key', () => {
    expect(() => new Cleanvoice({ apiKey: '' })).toThrow('API key is required');
  });

  it('builds a client from environment variables', () => {
    process.env.CLEANVOICE_API_KEY = 'env-key';
    process.env.CLEANVOICE_BASE_URL = 'https://api.example.com/v2';
    process.env.CLEANVOICE_TIMEOUT = '45000';

    const cv = Cleanvoice.fromEnv();

    expect(cv).toBeInstanceOf(Cleanvoice);
    expect(MockedApiClient).toHaveBeenCalledWith({
      apiKey: 'env-key',
      baseUrl: 'https://api.example.com/v2',
      timeout: 45000,
    });
  });

  it('processes audio and normalizes dependent options', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
    mockApiClient.retrieveEdit.mockResolvedValue(successResponse);

    const result = await cv.process(
      'https://example.com/audio.mp3',
      {
        fillers: true,
        social_content: true,
        sound_studio: true,
      },
      {
        templateId: 7,
        uploadType: 'podcast',
      }
    );

    expect(mockedFileHandler.validateConfig).toHaveBeenCalledWith({
      fillers: true,
      social_content: true,
      summarize: true,
      transcription: true,
      studio_sound: true,
      video: false,
    });
    expect(mockedFileHandler.normalizeFileInput).toHaveBeenCalledWith(
      'https://example.com/audio.mp3',
      mockApiClient
    );
    expect(mockApiClient.createEdit).toHaveBeenCalledWith({
      input: {
        files: ['https://example.com/audio.mp3'],
        config: {
          fillers: true,
          social_content: true,
          summarize: true,
          transcription: true,
          studio_sound: true,
          video: false,
        },
        template_id: 7,
        upload_type: 'podcast',
      },
    });
    expect(result.audio.url).toBe('https://example.com/processed.mp3');
    expect(result.media.mergedAudioUrl).toEqual(['https://example.com/alt.mp3']);
    expect(result.socialContent).toEqual(['clip']);
  });

  it('adds transcript and summarization data to the process result', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
    mockApiClient.retrieveEdit.mockResolvedValue({
      ...successResponse,
      result: {
        ...successResponse.result,
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
            paragraphs: [{ id: 0, start: 0, end: 10, speaker: 'SPEAKER_01' }],
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
      },
    });

    const result = await cv.process('https://example.com/audio.mp3', {
      summarize: true,
    });

    expect(result.transcript?.summary).toBe('This is a test summary');
    expect(result.transcript?.text).toBe('Hello world This is a test');
    expect(result.summarization?.title).toBe('Test Audio');
  });

  it('downloads output when outputPath is provided', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
    mockApiClient.retrieveEdit.mockResolvedValue(successResponse);

    const result = await cv.process(
      'https://example.com/audio.mp3',
      {},
      { outputPath: '/tmp/final.mp3' }
    );

    expect(mockedFileHandler.downloadFile).toHaveBeenCalledWith(
      'https://example.com/processed.mp3',
      '/tmp/final.mp3'
    );
    expect(result.audio.localPath).toBe('/tmp/output.mp3');
  });

  it('retries transient polling failures and emits progress', async () => {
    jest.useFakeTimers();
    const onProgress = jest.fn();
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
    mockApiClient.retrieveEdit
      .mockImplementationOnce(() => {
        throw new ApiError('Network timeout');
      })
      .mockResolvedValueOnce({
        status: 'STARTED',
        task_id: 'task-123',
        result: {
          done: 50,
          total: 100,
          state: 'processing',
          phase: 1,
          step: 1,
          substep: 1,
          job_name: 'worker',
        },
      })
      .mockResolvedValueOnce(successResponse);

    const promise = cv.process('https://example.com/audio.mp3', {}, {
      polling: { initialDelay: 10, onProgress },
    });

    await jest.advanceTimersByTimeAsync(20);
    const result = await promise;

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'STARTED',
        attempt: 1,
        editId: 'edit-123',
      })
    );
    expect(result.audio.filename).toBe('processed.mp3');
  });

  it('waits for SUCCESS results that arrive a poll later', async () => {
    jest.useFakeTimers();
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
    mockApiClient.retrieveEdit
      .mockResolvedValueOnce({
        status: 'SUCCESS',
        task_id: 'task-123',
      })
      .mockResolvedValueOnce(successResponse);

    const promise = cv.process('https://example.com/audio.mp3', {}, {
      polling: { initialDelay: 10 },
    });

    await jest.advanceTimersByTimeAsync(10);
    const result = await promise;

    expect(result.taskId).toBe('task-123');
  });

  it('creates an edit and returns the ID', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
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

  it('retrieves edit status', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.retrieveEdit.mockResolvedValue(successResponse);

    const result = await cv.getEdit('edit-123');

    expect(result).toEqual(successResponse);
  });

  it('checks authentication', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.checkAuth.mockResolvedValue({
      credit: {
        total: 100,
        subscription: 25,
        payg: 75,
      },
    });

    const result = await cv.checkAuth();

    expect(result).toEqual({
      credit: {
        total: 100,
        subscription: 25,
        payg: 75,
      },
    });
  });

  it('uploads a local file and returns the public URL', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.getSignedUploadUrl.mockResolvedValue(
      'https://upload.example.com/audio.mp3?signature=123'
    );
    mockApiClient.uploadFile.mockResolvedValue();

    const result = await cv.uploadFile('/tmp/audio.mp3');

    expect(result).toBe('https://upload.example.com/audio.mp3');
    expect(mockApiClient.getSignedUploadUrl).toHaveBeenCalledWith('audio.mp3');
    expect(mockApiClient.uploadFile).toHaveBeenCalledWith(
      '/tmp/audio.mp3',
      'https://upload.example.com/audio.mp3?signature=123'
    );
  });

  it('processes and downloads in one call', async () => {
    const cv = new Cleanvoice({ apiKey: 'test-key' });
    mockApiClient.createEdit.mockResolvedValue({ id: 'edit-123' });
    mockApiClient.retrieveEdit.mockResolvedValue(successResponse);

    const [result, localPath] = await cv.processAndDownload(
      'https://example.com/audio.mp3',
      '/tmp/final.mp3',
      { fillers: true }
    );

    expect(localPath).toBe('/tmp/output.mp3');
    expect(result.audio.localPath).toBe('/tmp/output.mp3');
  });
});