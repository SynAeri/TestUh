// Coding Contexts Browser
// View all captured AI coding sessions

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'https://unflattering-elinor-distinctively.ngrok-free.dev';

interface CodingContext {
  summary: string;
  decisions: string[];
  assumptions: string[];
  files_changed: string[];
  linked_pr_id: string | null;
  linked_ticket_id: string | null;
  linked_deployment_id: string | null;
  intended_outcome: string;
  session_timestamp: string;
}

export default function ContextsPage() {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedContextId, setSavedContextId] = useState<string | null>(null);

  const [newContext, setNewContext] = useState({
    transcript: ''
  });

  const saveContext = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/api/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(newContext)
      });
      const data = await response.json();
      setSavedContextId(data.context_id);
      setShowSaveModal(false);
      setNewContext({ transcript: '' });
    } catch (error) {
      console.error('Failed to save context:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <Link href="/incidents" className="hover:text-gray-700 transition-colors">
                &lt; Incidents
              </Link>
            </div>
            <h1 className="text-4xl font-semibold text-gray-900 mb-2">
              Coding Contexts
            </h1>
            <p className="text-gray-500">
              AI coding sessions captured for incident response
            </p>
          </div>
          <button
            onClick={() => setShowSaveModal(true)}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            &gt;_&lt; Save New Context
          </button>
        </div>

        {savedContextId && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <span>&gt;</span>
            <span>Context saved: {savedContextId}</span>
            <button
              onClick={() => setSavedContextId(null)}
              className="ml-auto text-green-600 hover:text-green-700"
            >
              ×
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-6xl mb-4">&gt;_&lt;</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Context Capture Feature
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            This feature allows you to save AI coding session transcripts. The AI will
            automatically extract decisions, assumptions, and file changes - creating a
            structured record for future incident response.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-sm font-semibold text-gray-700 mb-2">1. Capture</div>
              <div className="text-xs text-gray-600">
                Save Claude coding session transcripts via API or manual entry
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-sm font-semibold text-gray-700 mb-2">2. Structure</div>
              <div className="text-xs text-gray-600">
                AI extracts decisions, assumptions, and files changed automatically
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="text-sm font-semibold text-gray-700 mb-2">3. Link</div>
              <div className="text-xs text-gray-600">
                Context links to PRs, deployments, and shows up during incidents
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSaveModal(true)}
            className="mt-6 text-gray-900 hover:underline text-sm"
          >
            Try saving a context &gt;
          </button>
        </div>

        {/* Save Context Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                &gt;_&lt; Save Coding Context
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transcript or Session Notes
                  </label>
                  <textarea
                    value={newContext.transcript}
                    onChange={(e) => setNewContext({ transcript: e.target.value })}
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-500 font-mono text-sm"
                    placeholder="Paste your Claude coding session transcript here...

Example:
I helped the developer implement async payment processing with Stripe webhooks. We made several key decisions:

1. Set timeout to 5 seconds
2. Used async/await pattern
3. Assumed webhooks arrive quickly

Files changed: stripe_client.py, webhook_handler.py"
                  />
                </div>
                <div className="text-xs text-gray-500 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  <strong>How it works:</strong> The AI will analyze your transcript and extract:
                  decisions made, assumptions, files changed, and intended outcome. This structured
                  context is then available during incident response.
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={saveContext}
                  disabled={saving || !newContext.transcript.trim()}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? '&gt; Processing...' : '&gt; Save & Process with AI'}
                </button>
                <button
                  onClick={() => setShowSaveModal(false)}
                  disabled={saving}
                  className="px-6 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
