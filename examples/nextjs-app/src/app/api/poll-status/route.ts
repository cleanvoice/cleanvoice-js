import { NextRequest, NextResponse } from 'next/server';
import { Cleanvoice } from "cleanvoice-sdk";

export async function POST(request: NextRequest) {
  try {
    const { editId } = await request.json();

    const apiKey = process.env.CLEANVOICE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set CLEANVOICE_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    if (!editId) {
      return NextResponse.json(
        { error: 'Edit ID is required' },
        { status: 400 }
      );
    }

    // Initialize Cleanvoice SDK
    const cv = new Cleanvoice({ apiKey });

    // Get the current status - getEdit is appropriate for single status checks
    // pollStatus is designed for running the full polling loop until completion
    const status = await cv.getEdit(editId);

    console.log("Status:", status);
    

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error polling status:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      },
      { status: 500 }
    );
  }
} 