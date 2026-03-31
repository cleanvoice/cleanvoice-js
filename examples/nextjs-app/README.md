# Cleanvoice SDK Next.js Example

This example application shows how to use the Cleanvoice SDK from secure server-side Next.js routes. It includes basic processing, batch flows, video handling, and transcription with summaries.

## Features

- **Basic Audio Cleaning**: Remove fillers, normalize levels, and enhance audio quality
- **Batch Processing**: Process multiple audio files simultaneously
- **Video Processing**: Extract and process audio from video files
- **Transcription & AI Summary**: Convert speech to text with AI-generated summaries and chapters

## Setup

### 1. Install Dependencies

```bash
npm install
```

This example installs the latest published `@cleanvoice/cleanvoice-sdk` package from npm.

### 2. Configure Environment Variables

Copy the example environment file and add your Cleanvoice API key:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your actual API key:

```bash
CLEANVOICE_API_KEY=your_actual_api_key_here
```

**Important**: Never commit your `.env.local` file to version control. The API key should be kept secure and only stored server-side.

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## API Routes

The application includes several API routes that handle server-side communication with the Cleanvoice API:

- `/api/create-edit` - Creates a new audio processing job
- `/api/poll-status` - Checks the status of a processing job
- `/api/process-audio` - Runs the full process-and-wait flow
- `/api/batch-process` - Creates multiple processing jobs
- `/api/batch-status` - Checks status of multiple jobs

All API routes automatically use the `CLEANVOICE_API_KEY` environment variable for authentication.

## Security

This example follows security best practices:

- API keys are stored server-side only in environment variables
- No sensitive credentials are exposed to the frontend
- All Cleanvoice API calls are made from secure server-side API routes

## Learn More

- [Cleanvoice SDK Documentation](https://docs.cleanvoice.ai)
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) 