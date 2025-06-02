"use client";

import { useState } from "react";
import Link from "next/link";

interface ProgressState {
  stage: string;
  progress: number;
}

export default function Home() {
  const [audioUrl, setAudioUrl] = useState("");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProcess = async () => {
    if (!audioUrl) {
      setError("Please provide an audio URL");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setProgress(null);

    try {
      // Step 1: Create the edit job
      const createResponse = await fetch('/api/create-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          config: {
            fillers: true,
            normalize: true,
            transcription: true,
            summarize: true,
          }
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create edit job');
      }

      const { editId } = await createResponse.json();

      // Step 2: Poll for completion
      let completed = false;
      while (!completed) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
        
        const pollResponse = await fetch('/api/poll-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editId }),
        });

        const data = await pollResponse.json();
        
        if (data.status === 'SUCCESS') {
          setResult(data.result.download_url);
          setProgress({ stage: "Complete", progress: 100 });
          completed = true;
        } else if (data.status === 'FAILURE') {
          throw new Error('Processing failed');
        } else {
          // Update progress if available
          if (data.result && 'done' in data.result) {
            setProgress({
              stage: data.result.state || data.status,
              progress: data.result.done || 0
            });
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Cleanvoice SDK Example
        </h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Audio URL</label>
            <input
              type="url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://example.com/audio.mp3"
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg"
          >
            {loading ? "Processing..." : "Process Audio"}
          </button>

          {/* Progress Bar */}
          {progress && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Stage: {progress.stage}</span>
                <span>{progress.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-green-800 mb-2">🎉 Processing complete!</p>
              <a 
                href={result} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Download Processed Audio
              </a>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">How it works</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>1.</strong> Create edit job: <code>POST /api/create-edit</code></p>
            <p><strong>2.</strong> Poll for status: <code>POST /api/poll-status</code></p>
            <p><strong>3.</strong> Download result when complete</p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">More Examples</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/examples/basic" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <h3 className="font-semibold text-gray-800 mb-2">Basic Audio Cleaning</h3>
              <p className="text-sm text-gray-600">Remove fillers, normalize levels, and clean up audio quality</p>
            </Link>
            <Link href="/examples/batch" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <h3 className="font-semibold text-gray-800 mb-2">Batch Processing</h3>
              <p className="text-sm text-gray-600">Process multiple audio files simultaneously</p>
            </Link>
            <Link href="/examples/video" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <h3 className="font-semibold text-gray-800 mb-2">Video Processing</h3>
              <p className="text-sm text-gray-600">Extract and process audio from video files</p>
            </Link>
            <Link href="/examples/transcription" className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <h3 className="font-semibold text-gray-800 mb-2">Transcription & AI Summary</h3>
              <p className="text-sm text-gray-600">Speech-to-text with AI-generated summaries and chapters</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
