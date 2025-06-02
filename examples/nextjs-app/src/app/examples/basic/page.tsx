"use client";

import { useState } from "react";
import Link from "next/link";

interface ProcessingStats {
  FILLER_SOUND?: number;
  BREATH?: number;
  DEADAIR?: number;
  STUTTERING?: number;
  MOUTH_SOUND?: number;
}

interface ProgressState {
  stage: string;
  progress: number;
}

export default function BasicCleaning() {
  const [audioUrl, setAudioUrl] = useState("");
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [result, setResult] = useState<string>("");
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Processing options
  const [options, setOptions] = useState({
    fillers: true,
    long_silences: true,
    mouth_sounds: false,
    breath: false,
    stutters: false,
    normalize: true,
    remove_noise: true,
  });

  const handleOptionChange = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleProcess = async () => {
    if (!audioUrl) {
      setError("Please provide an audio URL");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setStats(null);
    setProgress(null);

    try {
      // Step 1: Create the edit job with basic cleaning config
      const createResponse = await fetch('/api/create-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl,
          config: {
            ...options,
            transcription: false, // No transcription for basic cleaning
            summarize: false,
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
          if (data.result.statistics) {
            setStats(data.result.statistics);
          }
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

  const getStatDescription = (key: keyof ProcessingStats) => {
    const descriptions = {
      FILLER_SOUND: "Filler sounds removed (um, uh, etc.)",
      BREATH: "Breath sounds reduced",
      DEADAIR: "Silent sections removed",
      STUTTERING: "Stutters fixed",
      MOUTH_SOUND: "Mouth sounds removed",
    };
    return descriptions[key] || key;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800">← Back to Home</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Basic Audio Cleaning</h1>
          <p className="text-gray-600">Clean up audio with AI-powered enhancement</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Audio URL</label>
            <input
              type="url"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://example.com/podcast.mp3"
              className="w-full px-3 py-2 border rounded-lg"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">Processing Options</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.fillers}
                  onChange={() => handleOptionChange('fillers')}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">Remove fillers (um, uh)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.long_silences}
                  onChange={() => handleOptionChange('long_silences')}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">Remove long silences</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.mouth_sounds}
                  onChange={() => handleOptionChange('mouth_sounds')}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">Remove mouth sounds</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.breath}
                  onChange={() => handleOptionChange('breath')}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">Reduce breath sounds</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.stutters}
                  onChange={() => handleOptionChange('stutters')}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">Fix stutters</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.normalize}
                  onChange={() => handleOptionChange('normalize')}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">Normalize levels</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.remove_noise}
                  onChange={() => handleOptionChange('remove_noise')}
                  disabled={loading}
                  className="mr-2"
                />
                <span className="text-sm">Remove background noise</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg"
          >
            {loading ? "Processing..." : "Clean Audio"}
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
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-green-800 mb-2">🎉 Audio cleaning complete!</p>
                <a 
                  href={result} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  Download Cleaned Audio
                </a>
              </div>

              {stats && Object.keys(stats).length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-3">Processing Statistics</h3>
                  <div className="space-y-2">
                    {Object.entries(stats).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-blue-700 text-sm">
                          {getStatDescription(key as keyof ProcessingStats)}
                        </span>
                        <span className="font-medium text-blue-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Audio Enhancement Types</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Speech Cleaning</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Fillers:</strong> Remove &quot;um&quot;, &quot;uh&quot;, &quot;like&quot;, etc.</li>
                <li>• <strong>Stutters:</strong> Fix speech repetitions</li>
                <li>• <strong>Long Silences:</strong> Remove dead air</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Audio Quality</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Normalize:</strong> Balance audio levels</li>
                <li>• <strong>Noise Removal:</strong> Clean background noise</li>
                <li>• <strong>Breath/Mouth Sounds:</strong> Reduce distracting sounds</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 