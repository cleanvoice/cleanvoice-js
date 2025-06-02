import { NextRequest, NextResponse } from 'next/server';
import { Cleanvoice } from 'cleanvoice-sdk';

export async function POST(request: NextRequest) {
  try {
    const { editIds } = await request.json();
    
    const apiKey = process.env.CLEANVOICE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured. Please set CLEANVOICE_API_KEY in your environment variables.' }, { status: 500 });
    }
    
    if (!editIds || !Array.isArray(editIds)) {
      return NextResponse.json({ error: 'Edit IDs array is required' }, { status: 400 });
    }

    const cv = new Cleanvoice({ apiKey });

    // Check status for all edit jobs
    const statuses = await Promise.all(
      editIds.map(async (item: { url: string, editId: string }) => {
        if (!item.editId) {
          return { ...item, status: 'error', result: null };
        }
        
        try {
          const edit = await cv.getEdit(item.editId);
          return { ...item, status: edit.status, result: edit.result };
        } catch (error) {
          return { ...item, status: 'error', result: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Batch status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 