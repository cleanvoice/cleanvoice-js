"use client";

import { useState } from "react";
import Link from "next/link";

interface BatchJob {
  url: string;
  editId: string | null;
  status: string;
  result?: { download_url?: string } | null;
  error?: string;
}

export default function BatchProcessing() {
  const [audioUrls, setAudioUrls] = useState(["", "", ""]);
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addUrlField = () => {
    setAudioUrls([...audioUrls, ""]);
  };

  const removeUrlField = (index: number) => {
    if (audioUrls.length > 1) {
      setAudioUrls(audioUrls.filter((_, i) => i !== index));
    }
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...audioUrls];
    newUrls[index] = value;
    setAudioUrls(newUrls);
  };

  const handleBatchProcess = async () => {
    const validUrls = audioUrls.filter(url => url.trim() !== "");
    
    if (validUrls.length === 0) {
      setError("Please provide at least one audio URL");
      return;
    }

    setLoading(true);
    setError("");
    setJobs([]);

    try {
      // Step 1: Create batch jobs
      const createResponse = await fetch('/api/batch-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrls: validUrls,
          config: {
            fillers: true,
            normalize: true,
            remove_noise: true,
            long_silences: true,
          }
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create batch jobs');
      }

      const { editIds } = await createResponse.json();
      setJobs(editIds);

      // Step 2: Poll for completion
      let allCompleted = false;
      while (!allCompleted) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await fetch('/api/batch-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ editIds }),
        });

        const { statuses } = await statusResponse.json();
        setJobs(statuses);

        // Check if all jobs are completed
        allCompleted = statuses.every((job: BatchJob) => 
          job.status === 'SUCCESS' || job.status === 'FAILURE' || job.status === 'error'
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS': return '✅';
      case 'FAILURE': return '❌';
      case 'error': return '❌';
      case 'PENDING': return '⏳';
      case 'STARTED': return '🔄';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'text-green-600';
      case 'FAILURE': return 'text-red-600';
      case 'error': return 'text-red-600';
      case 'PENDING': return 'text-yellow-600';
      case 'STARTED': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-800">← Back to Home</Link>
          <h1 className="text-3xl font-bold mt-4 mb-2">Batch Processing</h1>
          <p className="text-gray-600">Process multiple audio files simultaneously</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Audio URLs</label>
            {audioUrls.map((url, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateUrl(index, e.target.value)}
                  placeholder={`https://example.com/audio${index + 1}.mp3`}
                  className="flex-1 px-3 py-2 border rounded-lg"
                  disabled={loading}
                />
                {audioUrls.length > 1 && (
                  <button
                    onClick={() => removeUrlField(index)}
                    disabled={loading}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addUrlField}
              disabled={loading}
              className="mt-2 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300"
            >
              Add URL
            </button>
          </div>

          <button
            onClick={handleBatchProcess}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 px-4 rounded-lg"
          >
            {loading ? "Processing..." : "Start Batch Processing"}
          </button>

          {error && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {jobs.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Processing Status</h3>
              {jobs.map((job, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon(job.status)}</span>
                      <span className={`font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    {job.status === 'SUCCESS' && job.result?.download_url && (
                      <a
                        href={job.result.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Download
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 break-all">{job.url}</p>
                  {job.error && (
                    <p className="text-sm text-red-600 mt-1">Error: {job.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">How Batch Processing Works</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>1.</strong> Submit multiple audio URLs with the same processing config</p>
            <p><strong>2.</strong> Creates separate edit jobs for each file using <code>cv.createEdit()</code></p>
            <p><strong>3.</strong> Polls all jobs simultaneously until completion</p>
            <p><strong>4.</strong> Download processed files individually</p>
          </div>
        </div>
      </div>
    </div>
  );
} 