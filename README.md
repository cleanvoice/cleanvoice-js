# Cleanvoice SDK

> Official TypeScript SDK for Cleanvoice AI. Upload local files or use remote URLs, process audio or video, and download cleaned results from Node.js.

[![npm version](https://badge.fury.io/js/@cleanvoice%2Fcleanvoice-sdk.svg)](https://badge.fury.io/js/@cleanvoice%2Fcleanvoice-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Common Patterns](#common-patterns)
- [Examples](#examples)
- [File Upload and Download](#file-upload-and-download)
- [API Reference](#api-reference)
- [Configuration Options](#configuration-options)
- [Error Handling](#error-handling)
- [Supported Formats](#supported-formats)
- [Development](#development)

## Installation

```bash
npm install @cleanvoice/cleanvoice-sdk
```

## Quick Start

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = Cleanvoice.fromEnv();

const result = await client.process(
  'https://example.com/podcast.mp3',
  {
    fillers: true,
    normalize: true,
    studio_sound: true,
    summarize: true,
  },
  {
    outputPath: 'podcast-clean.mp3',
  }
);

console.log(result.media.url);
console.log(result.audio.localPath);
console.log(result.transcript?.summary);
```

## Authentication

Get your API key from the [Cleanvoice Dashboard](https://app.cleanvoice.ai/settings).

Recommended:

```bash
export CLEANVOICE_API_KEY="your-api-key-here"
```

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = Cleanvoice.fromEnv();
```

Explicit constructor:

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = new Cleanvoice({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.cleanvoice.ai/v2',
  timeout: 60000,
});
```

## Common Patterns

Choose the pattern that fits your workflow:

| Pattern | When to use |
| --- | --- |
| `process()` | One-call processing for scripts, jobs, and backend routes |
| `createEdit()` + `getEdit()` | Submit now, poll later |
| `process(..., { outputPath })` | Process and save in one call |
| `processAndDownload()` | Get both the result object and local saved path |

Notes:

- Local file upload is supported for Node.js and other server-side runtimes.
- Browser clients should keep API keys server-side and use backend routes.
- `social_content: true` automatically enables `summarize`.
- `summarize: true` automatically enables `transcription`.

## Examples

### Basic Audio Cleaning

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = Cleanvoice.fromEnv();

const result = await client.process('https://example.com/podcast.mp3', {
  fillers: true,
  long_silences: true,
  normalize: true,
  remove_noise: true,
});

console.log(result.audio.url);
console.log(result.audio.statistics.FILLER_SOUND);
```

### Local File Upload

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = Cleanvoice.fromEnv();

const result = await client.process(
  '/absolute/path/to/recording.mp3',
  {
    normalize: true,
    studio_sound: true,
  },
  {
    outputPath: 'recording-clean.mp3',
  }
);

console.log(result.audio.localPath);
```

### Progress Updates

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = Cleanvoice.fromEnv();

const result = await client.process(
  'https://example.com/audio.mp3',
  { summarize: true },
  {
    polling: {
      onProgress: ({ status, progress, attempt }) => {
        console.log(`Attempt ${attempt}: ${status}`, progress?.done ?? 0);
      },
    },
  }
);

console.log(result.transcript?.summary);
```

### Submit First, Poll Later

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = Cleanvoice.fromEnv();

const editId = await client.createEdit('https://example.com/audio.mp3', {
  fillers: true,
  normalize: true,
});

const edit = await client.getEdit(editId);
console.log(edit.status);
```

### More Examples

- [Node example](./examples/node-basic.js)
- [Next.js example app](./examples/nextjs-app/)

## File Upload and Download

### Upload Only

```typescript
const url = await client.uploadFile('/absolute/path/to/audio.mp3');
console.log(url);
```

### Download Only

```typescript
const localPath = await client.downloadFile(
  'https://cdn.cleanvoice.ai/output/audio.mp3',
  'audio.mp3'
);
```

### Download from a Result

```typescript
const result = await client.process('https://example.com/audio.mp3', {
  normalize: true,
});

const savedPath = await result.audio.download('enhanced.mp3');
console.log(savedPath);
```

### One-Call Process and Download

```typescript
const [result, savedPath] = await client.processAndDownload(
  'https://example.com/audio.mp3',
  'enhanced.mp3',
  {
    fillers: true,
    normalize: true,
  }
);

console.log(savedPath);
console.log(result.audio.localPath);
```

## API Reference

### `Cleanvoice.fromEnv(options?)`

Creates a client from environment variables.

Default variables:

- `CLEANVOICE_API_KEY`
- `CLEANVOICE_BASE_URL`
- `CLEANVOICE_TIMEOUT`

### `process(fileInput, config?, options?)`

Processes a remote URL or local file path and waits for completion.

`options` supports:

- `outputPath`
- `download`
- `templateId`
- `uploadType`
- `polling`

### `createEdit(fileInput, config?, options?)`

Creates an edit job and returns an edit ID without waiting for completion.

### `getEdit(editId)`

Fetches the latest edit status and result payload.

### `uploadFile(filePath, filename?)`

Uploads a local file and returns the public uploaded URL.

### `downloadFile(url, outputPath?)`

Downloads a remote file to disk.

### `processAndDownload(fileInput, outputPath?, config?, options?)`

Processes a file and returns both the `ProcessResult` and the saved output path.

### `checkAuth()`

Verifies the API key and returns the current credit balances.

```typescript
const account = await client.checkAuth();

console.log(account.credit.total);
console.log(account.credit.subscription);
console.log(account.credit.payg);
```

## Configuration Options

### Core Processing

| Option | Type | Description |
| --- | --- | --- |
| `fillers` | `boolean` | Remove filler sounds |
| `stutters` | `boolean` | Remove stutters |
| `long_silences` | `boolean` | Remove long silences |
| `mouth_sounds` | `boolean` | Remove mouth sounds |
| `hesitations` | `boolean` | Remove hesitations |
| `muted` | `boolean` | Mute edits instead of cutting |
| `remove_noise` | `boolean` | Remove background noise |
| `keep_music` | `boolean` | Preserve music sections |
| `breath` | `boolean \| string` | Breath reduction mode |
| `normalize` | `boolean` | Normalize loudness |
| `autoeq` | `boolean` | Legacy automatic EQ |
| `studio_sound` | `boolean \| string` | Studio sound mode |
| `sound_studio` | `boolean \| string` | Legacy alias for `studio_sound` |

### Output and Routing

| Option | Type | Description |
| --- | --- | --- |
| `export_format` | `'auto' \| 'mp3' \| 'wav' \| 'flac' \| 'm4a'` | Output format |
| `mute_lufs` | `number` | Mute threshold in LUFS |
| `target_lufs` | `number` | Target loudness in LUFS |
| `export_timestamps` | `boolean` | Export timestamp markers |
| `signed_url` | `string` | Upload results to your own signed URL |
| `send_email` | `boolean` | Email the result to the account |

### AI Features

| Option | Type | Description |
| --- | --- | --- |
| `transcription` | `boolean` | Generate transcription |
| `summarize` | `boolean` | Generate summarization |
| `social_content` | `boolean` | Generate social-ready content |

### Media and Advanced

| Option | Type | Description |
| --- | --- | --- |
| `video` | `boolean` | Force video mode |
| `merge` | `boolean` | Merge multi-track audio |
| `audio_for_edl` | `boolean` | Backend-specific audio-for-EDL flag |
| `automix` | `boolean` | Backend automix flag |
| `trim` | `boolean` | Backend trim flag |
| `waveform_preview` | `boolean` | Request waveform preview data |

## Error Handling

```typescript
import { ApiError, Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const client = Cleanvoice.fromEnv();

try {
  const result = await client.process('https://example.com/audio.mp3', {
    fillers: true,
    normalize: true,
  });
  console.log(result.audio.url);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message);
    console.error(error.status);
    console.error(error.code);
  } else {
    console.error(error);
  }
}
```

The client retries brief transient transport and HTTP failures during requests and polling.

## Supported Formats

Audio:

- `.wav`
- `.mp3`
- `.ogg`
- `.flac`
- `.m4a`
- `.aiff`
- `.aac`
- `.opus`

Video:

- `.mp4`
- `.mov`
- `.webm`
- `.avi`
- `.mkv`

## Development

```bash
npm run build
npm test
npm run test:coverage
npm run lint
```

## Requirements

- Node.js 16+
- TypeScript 5+

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Make your changes with tests.
4. Submit a pull request.

## Support

| | |
| --- | --- |
| Documentation | [docs.cleanvoice.ai](https://docs.cleanvoice.ai) |
| Email | [support@cleanvoice.ai](mailto:support@cleanvoice.ai) |
| Issues | [GitHub Issues](https://github.com/cleanvoice/cleanvoice-js/issues) |

## License

MIT - see [LICENSE](LICENSE).
