import { NextRequest, NextResponse } from 'next/server';
import { Cleanvoice, type ProcessingConfig } from "cleanvoice-sdk";

export async function POST(request: NextRequest) {
  try {
    const { audioUrl, config } = await request.json();

    const defaultConfig: ProcessingConfig = {
			fillers: true,
			normalize: true,
			transcription: true,
			summarize: true,
			sound_studio: true,
		};

    const apiKey = process.env.CLEANVOICE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set CLEANVOICE_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Audio URL is required' },
        { status: 400 }
      );
    }

    // Initialize Cleanvoice SDK
    const cv = new Cleanvoice({ apiKey });

    // Process the audio
    const result = await cv.process(audioUrl, config || defaultConfig);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing audio:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
} 