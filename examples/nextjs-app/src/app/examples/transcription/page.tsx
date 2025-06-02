"use client";

import { useState } from "react";
import Link from "next/link";

interface TranscriptResult {
  text: string;
  summary?: string;
  title?: string;
  chapters?: Array<{
    start: number;
    title: string;
  }>;
  paragraphs?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

interface ProgressState {
  stage: string;
  progress: number;
}

export default function TranscriptionExample() {
  const [audioUrl, setAudioUrl] = useState("");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [enableSummary, setEnableSummary] = useState(true);
  const [enableSocial, setEnableSocial] = useState(false);

  const handleProcess = async () => {
    if (!audioUrl) {
      setError("Please provide an audio URL");
      return;
    }

    setLoading(true);
    setError("");
    setTranscript(null);
    setProgress(null);

    try {
      // Step 1: Create the edit job with transcription config
      const createResponse = await fetch('/api/create-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          config: {
            transcription: true,
            summarize: enableSummary,
            social_content: enableSocial,
            normalize: true, // Light audio enhancement
            remove_noise: true,
          }
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create transcription job');
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
          // Extract transcript data from result
          if (data.result?.transcript) {
            setTranscript(data.result.transcript);
          }
          setProgress({ stage: "Complete", progress: 100 });
          completed = true;
        } else if (data.status === 'FAILURE') {
          throw new Error('Transcription failed');
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800">← Back to Home</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Transcription & AI Summary</h1>
          <p className="text-gray-600">Convert speech to text and generate AI summaries</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Audio URL</label>
            <input
              type="url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://example.com/speech.mp3"
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableSummary}
                onChange={(e) => setEnableSummary(e.target.checked)}
                disabled={loading}
                className="mr-2"
              />
              <span className="text-sm">Generate AI summary and chapters</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={enableSocial}
                onChange={(e) => setEnableSocial(e.target.checked)}
                disabled={loading || !enableSummary}
                className="mr-2"
              />
              <span className="text-sm">Optimize for social media (requires summary)</span>
            </label>
          </div>

          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg"
          >
            {loading ? "Transcribing..." : "Start Transcription"}
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

          {transcript && (
            <div className="space-y-6">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-green-800">🎉 Transcription complete!</p>
              </div>

              {transcript.title && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">AI Generated Title</h3>
                  <p className="text-blue-700">{transcript.title}</p>
                </div>
              )}

              {transcript.summary && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">AI Summary</h3>
                  <p className="text-yellow-700 leading-relaxed">{transcript.summary}</p>
                </div>
              )}

              {transcript.chapters && transcript.chapters.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-3">Chapters</h3>
                  <div className="space-y-2">
                    {transcript.chapters.map((chapter, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <span className="text-purple-600 font-mono text-sm bg-purple-100 px-2 py-1 rounded">
                          {formatTime(chapter.start)}
                        </span>
                        <span className="text-purple-700">{chapter.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">Full Transcript</h3>
                {transcript.paragraphs && transcript.paragraphs.length > 0 ? (
                  <div className="space-y-3">
                    {transcript.paragraphs.map((paragraph, index) => (
                      <div key={index} className="border-l-2 border-gray-300 pl-3">
                        <div className="text-xs text-gray-500 mb-1">
                          {formatTime(paragraph.start)} - {formatTime(paragraph.end)}
                        </div>
                        <p className="text-gray-700 leading-relaxed">{paragraph.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript.text}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Transcription Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Speech-to-Text</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• High accuracy transcription</li>
                <li>• Timestamps for each word</li>
                <li>• Paragraph segmentation</li>
                <li>• Speaker identification</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">AI Enhancement</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Auto-generated summaries</li>
                <li>• Chapter breakdowns</li>
                <li>• Key insights extraction</li>
                <li>• Social media optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 