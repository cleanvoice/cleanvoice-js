import { promises as fs } from 'fs';
import { extname } from 'path';
import { ProcessingConfig } from '../types';

/**
 * Supported audio file extensions
 */
const SUPPORTED_AUDIO_EXTENSIONS = [
  '.wav',
  '.mp3',
  '.ogg',
  '.flac',
  '.m4a',
  '.aiff',
  '.aac',
  '.opus',
];

/**
 * Supported video file extensions
 */
const SUPPORTED_VIDEO_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.webm',
  '.avi',
  '.mkv',
];

/**
 * Check if a string is a valid URL
 */
export function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file path exists locally
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if file extension is supported
 */
export function isValidAudioFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Validate if file extension is a supported video format
 */
export function isValidVideoFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return SUPPORTED_VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Validate if the input file is supported (audio or video)
 */
export function isValidMediaFile(filePath: string): boolean {
  return isValidAudioFile(filePath) || isValidVideoFile(filePath);
}

/**
 * Normalize file input to URL format
 * For local files, this would require upload functionality
 */
export async function normalizeFileInput(input: string): Promise<string> {
  // If it's already a URL, return as-is
  if (isUrl(input)) {
    return input;
  }

  // Check if local file exists
  const exists = await fileExists(input);
  if (!exists) {
    throw new Error(`File does not exist: ${input}`);
  }

  // Validate file type
  if (!isValidMediaFile(input)) {
    throw new Error(
      `Unsupported file format. Supported formats: ${[
        ...SUPPORTED_AUDIO_EXTENSIONS,
        ...SUPPORTED_VIDEO_EXTENSIONS,
      ].join(', ')}`
    );
  }

  // For now, throw an error as we haven't implemented file upload
  // In a production SDK, this would upload the file and return the URL
  throw new Error(
    'Local file upload not yet implemented. Please provide a URL to your audio file.'
  );
}

/**
 * Validate processing configuration
 */
export function validateConfig(config: ProcessingConfig): void {
  // Check mute_lufs is negative if provided
  if (config.mute_lufs !== undefined) {
    if (config.mute_lufs > 0) {
      throw new Error('mute_lufs must be a negative number or 0');
    }
  }

  // Check target_lufs is negative if provided
  if (config.target_lufs !== undefined) {
    if (config.target_lufs >= 0) {
      throw new Error('target_lufs must be less than 0');
    }
  }

  // Summarize requires transcription
  if (config.summarize === true && config.transcription !== true) {
    throw new Error('summarize requires transcription to be true');
  }

  // Social content requires summarize
  if (config.social_content === true && config.summarize !== true) {
    throw new Error('social_content requires summarize to be true');
  }
} 