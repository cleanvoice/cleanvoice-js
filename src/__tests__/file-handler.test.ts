import {
  downloadFile,
  isUrl,
  isValidAudioFile,
  isValidVideoFile,
  isValidMediaFile,
  normalizeFileInput,
  resolveDownloadDestination,
  signedUrlToPublicUrl,
  uploadLocalFile,
  validateConfig,
} from '../utils/file-handler';
import axios from 'axios';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('File Handler Utilities', () => {
  let tempFilePath: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    tempFilePath = join(tmpdir(), `cleanvoice-test-${Date.now()}.mp3`);
    await fs.writeFile(tempFilePath, 'audio-bytes');
  });

  afterEach(async () => {
    await fs.unlink(tempFilePath).catch(() => undefined);
  });

  describe('isUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('http://example.com')).toBe(true);
      expect(isUrl('https://example.com/path/to/file.mp3')).toBe(true);
      expect(isUrl('ftp://example.com')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isUrl('not-a-url')).toBe(false);
      expect(isUrl('./local/file.mp3')).toBe(false);
      expect(isUrl('/absolute/path.mp3')).toBe(false);
      expect(isUrl('')).toBe(false);
    });
  });

  describe('isValidAudioFile', () => {
    it('should return true for supported audio formats', () => {
      expect(isValidAudioFile('audio.wav')).toBe(true);
      expect(isValidAudioFile('audio.mp3')).toBe(true);
      expect(isValidAudioFile('audio.ogg')).toBe(true);
      expect(isValidAudioFile('audio.flac')).toBe(true);
      expect(isValidAudioFile('audio.m4a')).toBe(true);
      expect(isValidAudioFile('audio.aiff')).toBe(true);
      expect(isValidAudioFile('audio.aac')).toBe(true);
      expect(isValidAudioFile('audio.opus')).toBe(true);
      expect(isValidAudioFile('AUDIO.MP3')).toBe(true); // Case insensitive
    });

    it('should return false for unsupported formats', () => {
      expect(isValidAudioFile('audio.txt')).toBe(false);
      expect(isValidAudioFile('audio.pdf')).toBe(false);
      expect(isValidAudioFile('audio')).toBe(false);
      expect(isValidAudioFile('')).toBe(false);
    });
  });

  describe('isValidVideoFile', () => {
    it('should return true for supported video formats', () => {
      expect(isValidVideoFile('video.mp4')).toBe(true);
      expect(isValidVideoFile('video.mov')).toBe(true);
      expect(isValidVideoFile('video.webm')).toBe(true);
      expect(isValidVideoFile('video.avi')).toBe(true);
      expect(isValidVideoFile('video.mkv')).toBe(true);
      expect(isValidVideoFile('VIDEO.MP4')).toBe(true); // Case insensitive
    });

    it('should return false for unsupported formats', () => {
      expect(isValidVideoFile('video.txt')).toBe(false);
      expect(isValidVideoFile('video.pdf')).toBe(false);
      expect(isValidVideoFile('video')).toBe(false);
      expect(isValidVideoFile('')).toBe(false);
    });
  });

  describe('isValidMediaFile', () => {
    it('should return true for both audio and video files', () => {
      expect(isValidMediaFile('file.mp3')).toBe(true);
      expect(isValidMediaFile('file.mp4')).toBe(true);
      expect(isValidMediaFile('file.wav')).toBe(true);
      expect(isValidMediaFile('file.avi')).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      expect(isValidMediaFile('file.txt')).toBe(false);
      expect(isValidMediaFile('file.pdf')).toBe(false);
      expect(isValidMediaFile('')).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should pass with valid configuration', () => {
      expect(() => validateConfig({
        fillers: true,
        normalize: true,
        mute_lufs: -20,
        target_lufs: -16,
      })).not.toThrow();
    });

    it('should pass with transcription and summarization', () => {
      expect(() => validateConfig({
        transcription: true,
        summarize: true,
      })).not.toThrow();
    });

    it('should pass with all dependent options enabled', () => {
      expect(() => validateConfig({
        transcription: true,
        summarize: true,
        social_content: true,
      })).not.toThrow();
    });

    it('should throw error for positive mute_lufs', () => {
      expect(() => validateConfig({
        mute_lufs: 10,
      })).toThrow('mute_lufs must be a negative number or 0');
    });

    it('should throw error for non-negative target_lufs', () => {
      expect(() => validateConfig({
        target_lufs: 0,
      })).toThrow('target_lufs must be less than 0');

      expect(() => validateConfig({
        target_lufs: 5,
      })).toThrow('target_lufs must be less than 0');
    });

    it('should allow dependent flags because the SDK normalizes them before validation', () => {
      expect(() => validateConfig({
        summarize: true,
      })).not.toThrow();

      expect(() => validateConfig({
        social_content: true,
      })).not.toThrow();
    });

    it('should allow zero for mute_lufs', () => {
      expect(() => validateConfig({
        mute_lufs: 0,
      })).not.toThrow();
    });

    it('should allow negative values for both LUFS settings', () => {
      expect(() => validateConfig({
        mute_lufs: -80,
        target_lufs: -16,
      })).not.toThrow();
    });

    it('should reject duplicate studio_sound aliases', () => {
      expect(() => validateConfig({
        studio_sound: true,
        sound_studio: true,
      })).toThrow('Provide only one of sound_studio or studio_sound');
    });
  });

  describe('signedUrlToPublicUrl', () => {
    it('removes query parameters from signed URLs', () => {
      expect(
        signedUrlToPublicUrl('https://upload.example.com/file.mp3?signature=123&expires=1')
      ).toBe('https://upload.example.com/file.mp3');
    });
  });

  describe('resolveDownloadDestination', () => {
    it('prefers the provided destination', () => {
      expect(
        resolveDownloadDestination('https://example.com/file.mp3', '/tmp/custom.mp3')
      ).toBe('/tmp/custom.mp3');
    });

    it('infers a filename from the URL path', () => {
      expect(resolveDownloadDestination('https://example.com/path/file.mp3')).toBe('file.mp3');
    });
  });

  describe('uploadLocalFile / normalizeFileInput', () => {
    it('uploads a local file and returns the public URL', async () => {
      const apiClient = {
        getSignedUploadUrl: jest
          .fn()
          .mockResolvedValue('https://upload.example.com/file.mp3?signature=abc'),
        uploadFile: jest.fn().mockResolvedValue(undefined),
      };

      const result = await uploadLocalFile(tempFilePath, apiClient);

      expect(result).toBe('https://upload.example.com/file.mp3');
      expect(apiClient.getSignedUploadUrl).toHaveBeenCalledWith(expect.stringMatching(/\.mp3$/));
      expect(apiClient.uploadFile).toHaveBeenCalledWith(
        tempFilePath,
        'https://upload.example.com/file.mp3?signature=abc'
      );
    });

    it('normalizes URLs without uploading', async () => {
      const apiClient = {
        getSignedUploadUrl: jest.fn(),
        uploadFile: jest.fn(),
      };

      const result = await normalizeFileInput('https://example.com/audio.mp3', apiClient);

      expect(result).toBe('https://example.com/audio.mp3');
      expect(apiClient.getSignedUploadUrl).not.toHaveBeenCalled();
    });

    it('requires an API client for local uploads', async () => {
      await expect(normalizeFileInput(tempFilePath)).rejects.toThrow(
        'Local file uploads require a Cleanvoice API client'
      );
    });

    it('rejects invalid local media formats', async () => {
      const invalidPath = join(tmpdir(), `cleanvoice-test-${Date.now()}.txt`);
      await fs.writeFile(invalidPath, 'not-audio');

      await expect(
        uploadLocalFile(invalidPath, {
          getSignedUploadUrl: jest.fn(),
          uploadFile: jest.fn(),
        })
      ).rejects.toThrow('Unsupported file format');

      await fs.unlink(invalidPath).catch(() => undefined);
    });
  });

  describe('downloadFile', () => {
    it('downloads a stream to disk', async () => {
      const outputPath = join(tmpdir(), `cleanvoice-download-${Date.now()}.mp3`);
      mockedAxios.get.mockResolvedValue({
        data: Readable.from(['downloaded']),
      } as never);

      const result = await downloadFile('https://example.com/audio.mp3', outputPath);

      expect(result).toBe(outputPath);
      await expect(fs.readFile(outputPath, 'utf8')).resolves.toBe('downloaded');
      await fs.unlink(outputPath).catch(() => undefined);
    });

    it('cleans up partial downloads on failure', async () => {
      const outputPath = join(tmpdir(), `cleanvoice-download-${Date.now()}.mp3`);
      mockedAxios.get.mockRejectedValue(new Error('network down'));

      await expect(
        downloadFile('https://example.com/audio.mp3', outputPath)
      ).rejects.toThrow('File download failed: network down');

      await expect(fs.access(outputPath)).rejects.toThrow();
    });
  });
});