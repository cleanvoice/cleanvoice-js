# Cleanvoice SDK

Official TypeScript SDK for [Cleanvoice AI](https://cleanvoice.ai) - AI-powered audio processing and enhancement.

[![npm version](https://badge.fury.io/js/@cleanvoice%2Fcleanvoice-sdk.svg)](https://badge.fury.io/js/@cleanvoice%2Fcleanvoice-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎵 **Audio Processing**: Remove fillers, background noise, long silences, and more
- 📹 **Video Support**: Process audio tracks from video files
- 📝 **Transcription**: Convert speech to text with high accuracy
- 📊 **Summarization**: Generate summaries, chapters, and key learnings
- 🔧 **Type Safe**: Full TypeScript support with comprehensive type definitions
- ⚡ **Developer Friendly**: Simple, intuitive API design
- 🔄 **Async/Await**: Modern promise-based API
- 🎛️ **Extensible**: Comprehensive configuration options

## Installation

```bash
npm install @cleanvoice/cleanvoice-sdk
```

## Quick Start

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

// Process audio with AI
const { audio, transcript } = await cv.process(
  "https://example.com/podcast.mp3",
  { 
    fillers: true, 
    normalize: true, 
    transcription: true, 
    summarize: true 
  }
);

console.log('Processed audio:', audio.url);
console.log('Summary:', transcript?.summary);
```

## Authentication

Get your API key from the [Cleanvoice Dashboard](https://app.cleanvoice.ai/settings).

```typescript
const cv = new Cleanvoice({
  apiKey: 'your-api-key-here',
  // Optional: custom base URL
  baseUrl: 'https://api.cleanvoice.ai/v2',
  // Optional: request timeout in milliseconds
  timeout: 60000
});
```

## API Reference

### `process(fileInput, config)`

Process an audio or video file with AI enhancement.

**Parameters:**
- `fileInput` (string): URL to audio/video file
- `config` (ProcessingConfig): Processing options

**Returns:** `Promise<ProcessResult>`

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const result = await cv.process(
  "https://example.com/audio.mp3",
  {
    // Audio Enhancement
    fillers: true,           // Remove filler sounds (um, uh, etc.)
    stutters: true,          // Remove stutters
    long_silences: true,     // Remove long silences
    mouth_sounds: true,      // Remove mouth sounds
    breath: true,            // Reduce breath sounds
    remove_noise: true,      // Remove background noise
    normalize: true,         // Normalize audio levels
    
    // Advanced Options
    mute_lufs: -80,         // Mute threshold (negative number)
    target_lufs: -16,       // Target loudness level
    export_format: 'mp3',   // Output format: auto, mp3, wav, flac, m4a
    
    // AI Features
    transcription: true,     // Generate transcript
    summarize: true,         // Generate summary (requires transcription)
    social_content: true,    // Optimize for social media
    
    // Video
    video: false,           // Set to true for video files (auto-detected)
    
    // Multi-track
    merge: false,           // Merge multi-track audio
  }
);

// Access results
console.log(result.audio.url);           // Download URL
console.log(result.audio.statistics);    // Processing stats
console.log(result.transcript?.text);    // Full transcript
console.log(result.transcript?.summary); // AI summary
```

### `createEdit(fileInput, config)`

Create an edit job without waiting for completion.

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const editId = await cv.createEdit(
  "https://example.com/audio.mp3",
  { fillers: true, normalize: true }
);

console.log('Edit ID:', editId);
```

### `getEdit(editId)`

Get the status and results of an edit job.

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const edit = await cv.getEdit(editId);

if (edit.status === 'SUCCESS') {
  console.log('Download URL:', edit.result?.download_url);
} else {
  console.log('Status:', edit.status); // PENDING, STARTED, RETRY, FAILURE
}
```

### `checkAuth()`

Verify API authentication and get account information.

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const account = await cv.checkAuth();
console.log('Account info:', account);
```

## Configuration Options

### Audio Processing

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fillers` | boolean | false | Remove filler sounds (um, uh, etc.) |
| `stutters` | boolean | false | Remove stutters |
| `long_silences` | boolean | false | Remove long silences |
| `mouth_sounds` | boolean | false | Remove mouth sounds |
| `hesitations` | boolean | false | Remove hesitations |
| `breath` | boolean \| string | false | Reduce breath sounds ("natural", "legacy", "muted") |
| `remove_noise` | boolean | true | Remove background noise |
| `keep_music` | boolean | false | Preserve music sections |
| `normalize` | boolean | false | Normalize audio levels |
| `studio_sound` | boolean \| string | false | Studio sound algorithm selection ("nightly") |

### Output Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `export_format` | string | 'auto' | Output format: auto, mp3, wav, flac, m4a |
| `mute_lufs` | number | -80 | Mute threshold in LUFS (negative) |
| `target_lufs` | number | -16 | Target loudness in LUFS (negative) |
| `export_timestamps` | boolean | false | Export edit timestamps |

### AI Features

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `transcription` | boolean | false | Generate speech-to-text |
| `summarize` | boolean | false | Generate AI summary (requires transcription) |
| `social_content` | boolean | false | Optimize for social media (requires summarize) |

### Other Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `video` | boolean | auto-detected | Process video file |
| `merge` | boolean | false | Merge multi-track audio |
| `send_email` | boolean | false | Email results to account |

## Response Types

### ProcessResult

```typescript
interface ProcessResult {
  audio: {
    url: string;           // Download URL
    filename: string;      // Generated filename
    statistics: {          // Processing statistics
      FILLER_SOUND?: number;
      BREATH?: number;
      DEADAIR?: number;
      STUTTERING?: number;
      MOUTH_SOUND?: number;
    };
  };
  transcript?: {
    text: string;          // Full transcript text
    paragraphs: Array<{    // Paragraph-level data
      start: number;
      end: number;
      text: string;
    }>;
    detailed: {            // Word-level data
      words: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
      }>;
      paragraphs: Array<{
        id: number;
        start: number;
        end: number;
        speaker: string;
      }>;
    };
    summary?: string;      // AI-generated summary
    title?: string;        // AI-generated title
    chapters?: Array<{     // Chapter breakdowns
      start: number;
      title: string;
    }>;
  };
}
```

## Examples

### Basic Audio Cleaning

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const { audio } = await cv.process(
  "https://example.com/podcast.mp3",
  {
    fillers: true,
    long_silences: true,
    normalize: true,
    remove_noise: true
  }
);

console.log(`Cleaned audio: ${audio.url}`);
console.log(`Removed ${audio.statistics.FILLER_SOUND} filler sounds`);
```

### Transcription and Summary

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const { transcript } = await cv.process(
  "https://example.com/interview.wav",
  {
    transcription: true,
    summarize: true,
    normalize: true
  }
);

console.log('Title:', transcript?.title);
console.log('Summary:', transcript?.summary);
console.log('Chapters:', transcript?.chapters);
```

### Video Processing

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const result = await cv.process(
  "https://example.com/video.mp4",
  {
    video: true,  // Optional: auto-detected
    fillers: true,
    transcription: true,
    export_format: 'mp3'
  }
);

console.log('Processed audio:', result.audio.url);
```

### Batch Processing

```typescript
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

const files = [
  "https://example.com/episode1.mp3",
  "https://example.com/episode2.mp3",
  "https://example.com/episode3.mp3"
];

const editIds = await Promise.all(
  files.map(file => cv.createEdit(file, { fillers: true, normalize: true }))
);

// Poll for completion
const results = await Promise.all(
  editIds.map(async (id) => {
    let edit;
    do {
      edit = await cv.getEdit(id);
      if (edit.status === 'PENDING' || edit.status === 'STARTED') {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } while (edit.status === 'PENDING' || edit.status === 'STARTED');
    
    return edit;
  })
);

console.log('All processing completed:', results.length, 'files');
```

### Complete Example Applications

For complete, runnable example applications, check out the `examples/` directory:

- **[Next.js Application](./examples/nextjs-app/)**: A comprehensive web app demonstrating all SDK features including audio processing, transcription, video processing, and batch operations.

Each example includes:
- Complete setup instructions
- Environment configuration
- Real-world usage patterns
- Error handling
- UI components and styling

To get started with an example:
```bash
cd examples/nextjs-app
npm install
cp .env.local.example .env.local
# Add your API key to .env.local
npm run dev
```
## Error Handling

```typescript
import { Cleanvoice, ApiError } from '@cleanvoice/cleanvoice-sdk';

const cv = new Cleanvoice({ 
  apiKey: process.env.CLEANVOICE_API_KEY! 
});

try {
  const result = await cv.process(
    "https://example.com/audio.mp3",
    { fillers: true, normalize: true }
  );
  console.log('Success:', result.audio.url);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    
    // Check if it's an API error
    const apiError = error as ApiError;
    if (apiError.status) {
      console.error('HTTP Status:', apiError.status);
      console.error('Error Code:', apiError.code);
    }
  }
}
```

## Supported File Formats

### Audio Formats
- WAV (.wav)
- MP3 (.mp3)
- OGG (.ogg)
- FLAC (.flac)
- M4A (.m4a)
- AIFF (.aiff)
- AAC (.aac)
- Opus (.opus)

### Video Formats
- MP4 (.mp4)
- MOV (.mov)
- WebM (.webm)
- AVI (.avi)
- MKV (.mkv)

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Requirements

- Node.js 16+ 
- TypeScript 5+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://docs.cleanvoice.ai)
- 📧 [Email Support](mailto:support@cleanvoice.ai)
- 🐛 [Report Issues](https://github.com/cleanvoice/cleanvoice-sdk/issues)
