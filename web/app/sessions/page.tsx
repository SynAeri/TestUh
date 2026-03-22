// AI Sessions Browser
// View all captured AI coding sessions from MCP skill with Raw/Refined/Context views

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'https://unflattering-elinor-distinctively.ngrok-free.dev';

interface AISession {
  id: string;
  repo: string;
  branch: string;
  agent: string;
  engineer?: string;
  ticket_id?: string;
  started_at: string;
  ended_at?: string;
  pr_id?: string;
  decision_count: number;
}

interface AIDecision {
  id: string;
  session_id: string;
  summary: string;
  reasoning: string;
  impact: string;
  files_changed: string[];
  timestamp: string;
}

// Transcript View Buttons Component
function TranscriptViewButtons({ sessionId }: { sessionId: string }) {
  const [viewMode, setViewMode] = useState<'context' | 'raw' | 'refined'>('context');
  const [showModal, setShowModal] = useState(false);
  const [transcript, setTranscript] = useState<any>(null);
  const [refined, setRefined] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadRawTranscript = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/transcripts/${sessionId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      setTranscript(data);
    } catch (error) {
      console.error('Failed to load transcript:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRefinedTranscript = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/transcripts/${sessionId}/refined`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      setRefined(data);
    } catch (error) {
      console.error('Failed to load refined transcript:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = async (mode: 'context' | 'raw' | 'refined') => {
    setViewMode(mode);
    if (mode === 'raw') {
      await loadRawTranscript();
      setShowModal(true);
    } else if (mode === 'refined') {
      await loadRefinedTranscript();
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('context')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'context'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Context
        </button>
        <button
          onClick={() => handleViewChange('raw')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'raw'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Raw Logs
        </button>
        <button
          onClick={() => handleViewChange('refined')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'refined'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Refined
        </button>
      </div>

      {/* Modal for Raw/Refined Views */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {viewMode === 'raw' ? 'Raw Transcript' : 'Refined Summary'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setViewMode('context');
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {viewMode === 'raw'
                  ? 'Full conversation log from AI coding session'
                  : 'AI-generated summary of major changes and decisions'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : viewMode === 'raw' && transcript ? (
                <div className="space-y-4">
                  {transcript.messages && transcript.messages.length > 0 ? (
                    transcript.messages.map((msg: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : 'bg-gray-50 border-l-4 border-gray-400'
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-500 mb-2">
                          {msg.role === 'user' ? 'USER' : 'ASSISTANT'} •{' '}
                          {new Date(msg.timestamp).toLocaleString()}
                        </div>
                        <div className="text-gray-900 whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No transcript messages found for this session.
                      <div className="text-sm mt-2">The MCP skill may not have logged messages yet.</div>
                    </div>
                  )}
                </div>
              ) : viewMode === 'refined' && refined ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="text-xs text-green-700 mb-1">
                      Generated: {new Date(refined.generated_at).toLocaleString()}
                      {refined.cached && ' • Cached'}
                    </div>
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                    {refined.refined_content}
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">No data available</div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowModal(false);
                  setViewMode('context');
                }}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AISession | null>(null);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      setSessions(data.sessions || []);

      // Auto-select first session
      if (data.sessions && data.sessions.length > 0) {
        loadSessionDetails(data.sessions[0].id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      setSelectedSession(data.session);
      setDecisions(data.decisions || []);
    } catch (error) {
      console.error('Failed to load session details:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-gray-500">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 mb-2">
              AI Coding Sessions
            </h1>
            <p className="text-gray-500">
              View all captured sessions from MCP skill
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">&gt;_&lt;</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Sessions Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Start a coding session with Claude using the MCP skill to see it appear here.
              Sessions are automatically captured when you use nexus_start_session.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Sessions List */}
            <div className="col-span-1 space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSessionDetails(session.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedSession?.id === session.id
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">{session.repo}</div>
                  <div className="text-xs opacity-70">{session.branch}</div>
                  <div className="text-xs opacity-50 mt-2">
                    {new Date(session.started_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {session.decision_count} decisions
                  </div>
                </button>
              ))}
            </div>

            {/* Session Details */}
            {selectedSession && (
              <div className="col-span-2 space-y-4">
                {/* Header with View Buttons */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {selectedSession.repo} @ {selectedSession.branch}
                    </h2>
                    <TranscriptViewButtons sessionId={selectedSession.id} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Session ID</div>
                      <div className="font-mono text-xs">{selectedSession.id}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Engineer</div>
                      <div>{selectedSession.engineer || 'AI Agent'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Started</div>
                      <div>{new Date(selectedSession.started_at).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 mb-1">Status</div>
                      <div>{selectedSession.ended_at ? 'Completed' : 'In Progress'}</div>
                    </div>
                    {selectedSession.pr_id && (
                      <div>
                        <div className="text-gray-500 mb-1">PR</div>
                        <div className="font-mono text-xs">{selectedSession.pr_id}</div>
                      </div>
                    )}
                    {selectedSession.ticket_id && (
                      <div>
                        <div className="text-gray-500 mb-1">Ticket</div>
                        <div className="font-mono text-xs">{selectedSession.ticket_id}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Decisions */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Decisions ({decisions.length})
                  </h3>
                  {decisions.length === 0 ? (
                    <div className="text-gray-500 text-sm text-center py-8">
                      No decisions logged yet for this session
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {decisions.map((decision) => (
                        <div key={decision.id} className="border-l-4 border-blue-500 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{decision.summary}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${
                                decision.impact === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : decision.impact === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {decision.impact}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">{decision.reasoning}</div>
                          {decision.files_changed && decision.files_changed.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Files: {decision.files_changed.join(', ')}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(decision.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
