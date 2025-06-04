import { NextRequest, NextResponse } from 'next/server';
import { Cleanvoice } from '@cleanvoice/cleanvoice-sdk';

export async function POST(request: NextRequest) {
  try {
    const { audioUrls, config } = await request.json();
    
    const apiKey = process.env.CLEANVOICE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured. Please set CLEANVOICE_API_KEY in your environment variables.' }, { status: 500 });
    }
    
    if (!audioUrls || !Array.isArray(audioUrls) || audioUrls.length === 0) {
      return NextResponse.json({ error: 'Audio URLs array is required' }, { status: 400 });
    }

    const cv = new Cleanvoice({ apiKey });

    // Create edit jobs for all files
    const editIds = await Promise.all(
      audioUrls.map(async (url: string) => {
        try {
          const editId = await cv.createEdit(url, config);
          return { url, editId, status: 'created' };
        } catch (error) {
          return { url, editId: null, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    return NextResponse.json({ editIds });
  } catch (error) {
    console.error('Batch process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 