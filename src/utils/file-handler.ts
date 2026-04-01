import axios from 'axios';
import { createWriteStream, promises as fs } from 'fs';
import { basename, dirname, extname, join } from 'path';
import { finished } from 'stream/promises';
import {
  ApiError,
  ProcessingConfig,
} from '../types';

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

type UploadCapableClient = {
  getSignedUploadUrl(filename: string): Promise<string>;
  uploadFile(filePath: string, signedUrl: string): Promise<void>;
};

function getPathExtension(input: string): string {
  if (isUrl(input)) {
    try {
      return extname(new URL(input).pathname).toLowerCase();
    } catch {
      return '';
    }
  }

  return extname(input).toLowerCase();
}

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
  const ext = getPathExtension(filePath);
  return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Validate if file extension is a supported video format
 */
export function isValidVideoFile(filePath: string): boolean {
  const ext = getPathExtension(filePath);
  return SUPPORTED_VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Validate if the input file is supported (audio or video)
 */
export function isValidMediaFile(filePath: string): boolean {
  return isValidAudioFile(filePath) || isValidVideoFile(filePath);
}

/**
 * Strip query params from a signed upload URL.
 */
export function signedUrlToPublicUrl(signedUrl: string): string {
  const parsed = new URL(signedUrl);
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

/**
 * Resolve the output path for a download.
 */
export function resolveDownloadDestination(
  url: string,
  destination?: string,
  defaultFilename: string = 'downloaded_audio.mp3'
): string {
  if (destination) {
    return destination;
  }

  try {
    const parsed = new URL(url);
    const inferredFilename = basename(parsed.pathname);
    return inferredFilename || defaultFilename;
  } catch {
    return defaultFilename;
  }
}

/**
 * Upload a local file and return the resulting public URL.
 */
export async function uploadLocalFile(
  filePath: string,
  apiClient: UploadCapableClient,
  filename?: string
): Promise<string> {
  const exists = await fileExists(filePath);
  if (!exists) {
    throw new ApiError(`File does not exist: ${filePath}`);
  }

  if (!isValidMediaFile(filePath)) {
    throw new ApiError(
      `Unsupported file format. Supported formats: ${[
        ...SUPPORTED_AUDIO_EXTENSIONS,
        ...SUPPORTED_VIDEO_EXTENSIONS,
      ].join(', ')}`
    );
  }

  const uploadFilename = filename || basename(filePath);
  const signedUrl = await apiClient.getSignedUploadUrl(uploadFilename);
  await apiClient.uploadFile(filePath, signedUrl);
  return signedUrlToPublicUrl(signedUrl);
}

/**
 * Normalize file input to URL format.
 */
export async function normalizeFileInput(
  input: string,
  apiClient?: UploadCapableClient
): Promise<string> {
  if (isUrl(input)) {
    return input;
  }

  const exists = await fileExists(input);
  if (!exists) {
    throw new ApiError(`File does not exist: ${input}`);
  }

  if (!isValidMediaFile(input)) {
    throw new ApiError(
      `Unsupported file format. Supported formats: ${[
        ...SUPPORTED_AUDIO_EXTENSIONS,
        ...SUPPORTED_VIDEO_EXTENSIONS,
      ].join(', ')}`
    );
  }

  if (!apiClient) {
    throw new ApiError(
      'Local file uploads require a Cleanvoice API client. Pass a client when normalizing local paths.'
    );
  }

  return uploadLocalFile(input, apiClient);
}

/**
 * Download a file from a URL to the local filesystem.
 */
export async function downloadFile(
  url: string,
  destination?: string
): Promise<string> {
  if (!isUrl(url)) {
    throw new ApiError(`Invalid URL: ${url}`);
  }

  const outputPath = resolveDownloadDestination(url, destination);
  const tempOutputPath = join(
    dirname(outputPath),
    `.${basename(outputPath)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
  );

  try {
    const response = await axios.get<NodeJS.ReadableStream>(url, {
      responseType: 'stream',
      timeout: 300000,
    });
    const stream = createWriteStream(tempOutputPath);

    response.data.pipe(stream);
    await finished(stream);
    await fs.rename(tempOutputPath, outputPath);

    return outputPath;
  } catch (error) {
    await fs.unlink(tempOutputPath).catch(() => undefined);

    if (error instanceof ApiError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown download error';
    throw new ApiError(`File download failed: ${message}`);
  }
}

/**
 * Validate processing configuration
 */
export function validateConfig(config: ProcessingConfig): void {
  if (config.sound_studio !== undefined && config.studio_sound !== undefined) {
    throw new ApiError('Provide only one of sound_studio or studio_sound');
  }

  // Check mute_lufs is negative if provided
  if (config.mute_lufs !== undefined) {
    if (config.mute_lufs > 0) {
      throw new ApiError('mute_lufs must be a negative number or 0');
    }
  }

  // Check target_lufs is negative if provided
  if (config.target_lufs !== undefined) {
    if (config.target_lufs >= 0) {
      throw new ApiError('target_lufs must be less than 0');
    }
  }
}
