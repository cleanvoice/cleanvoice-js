"use client";

import { useState } from "react";
import Link from "next/link";

interface ProgressState {
  stage: string;
  progress: number;
}

export default function VideoProcessing() {
  const [videoUrl, setVideoUrl] = useState("");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportFormat, setExportFormat] = useState("mp3");

  const handleProcess = async () => {
    if (!videoUrl) {
      setError("Please provide a video URL");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setProgress(null);

    try {
      // Step 1: Create the edit job with video-specific config
      const createResponse = await fetch('/api/create-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: videoUrl,
          config: {
            video: true, // Explicitly enable video processing
            fillers: true,
            long_silences: true,
            normalize: true,
            remove_noise: true,
            export_format: exportFormat,
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        
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
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800">← Back to Home</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Video Processing</h1>
          <p className="text-gray-600">Extract and process audio from video files</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Video URL</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loading}
            >
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="m4a">M4A</option>
              <option value="flac">FLAC</option>
            </select>
          </div>

          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg"
          >
            {loading ? "Processing Video..." : "Process Video"}
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
              <p className="text-green-800 mb-2">🎉 Video processing complete!</p>
              <a 
                href={result} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Download Processed Audio ({exportFormat.toUpperCase()})
              </a>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Video Processing Features</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800">Supported Video Formats</h3>
              <p className="text-sm text-gray-600">MP4, MOV, WebM, AVI, MKV</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Processing Options</h3>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Remove filler sounds from speech</li>
                <li>Remove long silences and dead air</li>
                <li>Normalize audio levels</li>
                <li>Remove background noise</li>
                <li>Generate transcript and summary</li>
                <li>Export audio in various formats</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">How it Works</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>1.</strong> Upload video file URL</p>
                <p><strong>2.</strong> SDK extracts audio track automatically</p>
                <p><strong>3.</strong> AI processes the audio content</p>
                <p><strong>4.</strong> Download clean audio in chosen format</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 