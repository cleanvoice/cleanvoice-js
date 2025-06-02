import {
  isUrl,
  isValidAudioFile,
  isValidVideoFile,
  isValidMediaFile,
  validateConfig,
} from '../utils/file-handler';

describe('File Handler Utilities', () => {
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

    it('should throw error for summarize without transcription', () => {
      expect(() => validateConfig({
        summarize: true,
      })).toThrow('summarize requires transcription to be true');

      expect(() => validateConfig({
        transcription: false,
        summarize: true,
      })).toThrow('summarize requires transcription to be true');
    });

    it('should throw error for social_content without summarize', () => {
      expect(() => validateConfig({
        social_content: true,
      })).toThrow('social_content requires summarize to be true');

      expect(() => validateConfig({
        transcription: true,
        social_content: true,
      })).toThrow('social_content requires summarize to be true');
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
  });
}); 