// AI-Powered Incident Response Dashboard
// Clean Notion-style interface for viewing incidents with linked coding context

'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = 'https://unflattering-elinor-distinctively.ngrok-free.dev';

interface CodingContext {
  summary: string;
  decisions: string[];
  assumptions: string[];
  files_changed: string[];
  intended_outcome: string;
  session_timestamp: string;
}

interface PR {
  pr_id: string;
  title: string;
  description: string;
  author: string;
  commit_sha: string;
  status: string;
  created_at: string;
  merged_at: string | null;
}

interface Deployment {
  deployment_id: string;
  commit_sha: string;
  environment: string;
  service_name: string;
  timestamp: string;
  status: string;
  deployed_by: string;
}

interface Incident {
  incident_id: string;
  title: string;
  symptoms: string;
  impacted_service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
  deployment?: Deployment;
  related_pr?: PR;
  coding_context?: CodingContext;
}

interface FixDraft {
  incident_id: string;
  analysis: string;
  probable_cause: string;
  proposed_fix: string;
  patch_notes: string;
  review_state: string;
  draft_id: string;
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
              ? 'bg-amber-200 text-amber-900'
              : 'bg-white text-gray-600 hover:bg-amber-100'
          }`}
        >
          Context
        </button>
        <button
          onClick={() => handleViewChange('raw')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'raw'
              ? 'bg-amber-200 text-amber-900'
              : 'bg-white text-gray-600 hover:bg-amber-100'
          }`}
        >
          Raw Logs
        </button>
        <button
          onClick={() => handleViewChange('refined')}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            viewMode === 'refined'
              ? 'bg-amber-200 text-amber-900'
              : 'bg-white text-gray-600 hover:bg-amber-100'
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
                  className="text-gray-400 hover:text-gray-600"
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
                      <div className="text-lg mb-2">No transcript available</div>
                      <div className="text-sm">
                        This incident was created before transcript logging was implemented.
                        <br />
                        New sessions will automatically log full conversations.
                      </div>
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

export default function IncidentDashboard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: incidentId } = use(params);

  const [incident, setIncident] = useState<Incident | null>(null);
  const [fix, setFix] = useState<FixDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [draftingFix, setDraftingFix] = useState(false);
  const [assigningReview, setAssigningReview] = useState(false);
  const [reviewAssigned, setReviewAssigned] = useState(false);

  useEffect(() => {
    loadIncident();
  }, [incidentId]);

  const loadIncident = async () => {
    try {
      if (incidentId) {
        // Load specific incident
        const response = await fetch(`${API_BASE}/api/incidents/${incidentId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const data = await response.json();
        setIncident(data);
      } else {
        // Load demo packet
        const response = await fetch(`${API_BASE}/api/demo/packet`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const data = await response.json();
        setIncident(data.incident);
      }
    } catch (error) {
      console.error('Failed to load incident:', error);
    } finally {
      setLoading(false);
    }
  };

  const draftFix = async () => {
    if (!incident) return;
    setDraftingFix(true);
    try {
      const response = await fetch(`${API_BASE}/api/fix/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ incident_id: incident.incident_id })
      });
      const data = await response.json();
      setFix(data);
    } catch (error) {
      console.error('Failed to draft fix:', error);
    } finally {
      setDraftingFix(false);
    }
  };

  const assignForReview = async () => {
    if (!fix) return;
    setAssigningReview(true);
    try {
      const response = await fetch(`${API_BASE}/api/reviews/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          draft_id: fix.draft_id,
          reviewer: 'senior-engineer@company.com',
          comment: 'Please review this AI-drafted fix for the payment timeout incident'
        })
      });
      const data = await response.json();
      setReviewAssigned(true);
      setFix({ ...fix, review_state: data.review_state });
    } catch (error) {
      console.error('Failed to assign review:', error);
    } finally {
      setAssigningReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-gray-500">Loading incident data...</div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-gray-500">No incident data available</div>
      </div>
    );
  }

  const severityColor = {
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200'
  }[incident.severity];

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
            <Link href="/incidents" className="hover:text-gray-700 transition-colors">
              &lt; Incidents
            </Link>
            <span>&gt;</span>
            <span className="text-gray-800">{incident.incident_id}</span>
          </div>
          <h1 className="text-4xl font-semibold text-gray-900 mb-4">
            {incident.title}
          </h1>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-md text-sm font-medium border ${severityColor}`}>
              ! {incident.severity.toUpperCase()}
            </span>
            <span className="px-3 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {incident.status}
            </span>
          </div>
        </div>

        {/* Incident Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            &gt; Incident Details
          </h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Symptoms</div>
              <div className="text-gray-900">{incident.symptoms}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Impacted Service</div>
              <div className="text-gray-900 font-mono text-sm">{incident.impacted_service}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Started</div>
              <div className="text-gray-900">
                {new Date(incident.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Timeline */}
        {incident.deployment && incident.related_pr && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              &gt; Timeline
            </h2>
            <div className="relative">
              <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-gray-200"></div>

              <div className="relative flex gap-4 mb-6">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm mt-1 z-10"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    PR Merged
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {incident.related_pr.pr_id}: {incident.related_pr.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(incident.related_pr.merged_at!).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="relative flex gap-4 mb-6">
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm mt-1 z-10"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Deployed to {incident.deployment.environment}
                  </div>
                  <div className="text-sm text-gray-600 mb-2 font-mono">
                    {incident.deployment.commit_sha}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(incident.deployment.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="relative flex gap-4">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm mt-1 z-10"></div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    Incident Triggered
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {incident.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(incident.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coding Context - THE KEY VALUE */}
        {incident.coding_context && (
          <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-6 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
                  &gt;_&lt; AI Coding Context
                </h2>
                <span className="text-xs bg-amber-100 px-2 py-1 rounded-md text-amber-700 font-medium">
                  THE MAGIC
                </span>
              </div>
              <TranscriptViewButtons sessionId={incident.coding_context.session_timestamp} />
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-amber-900 mb-2">Summary</div>
                <div className="text-gray-900 leading-relaxed">
                  {incident.coding_context.summary}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-amber-900 mb-2">Key Decisions</div>
                <ul className="space-y-2">
                  {incident.coding_context.decisions.map((decision, i) => (
                    <li key={i} className="flex gap-2 text-gray-900">
                      <span className="text-amber-600 mt-0.5">&gt;</span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
                  Assumptions
                  <span className="text-xs bg-red-100 px-2 py-0.5 rounded text-red-700">
                    ! Check these
                  </span>
                </div>
                <ul className="space-y-2">
                  {incident.coding_context.assumptions.map((assumption, i) => (
                    <li key={i} className="flex gap-2 text-gray-900">
                      <span className="text-amber-600 mt-0.5">&gt;</span>
                      <span>{assumption}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-sm font-medium text-amber-900 mb-2">Files Changed</div>
                <div className="space-y-1">
                  {incident.coding_context.files_changed.map((file, i) => (
                    <div key={i} className="text-sm font-mono text-gray-700 bg-white px-3 py-2 rounded border border-amber-100">
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Draft Fix Button */}
        {!fix && (
          <button
            onClick={draftFix}
            disabled={draftingFix}
            className="w-full bg-gray-900 text-white py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm mb-4"
          >
            {draftingFix ? '> Analyzing with AI...' : '> Draft AI Fix'}
          </button>
        )}

        {/* AI-Drafted Fix */}
        {fix && (
          <div className="bg-white rounded-lg border-2 border-green-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-green-900 uppercase tracking-wide">
                &gt; AI-Drafted Fix
              </h2>
              <span className="text-xs bg-green-100 px-2 py-1 rounded-md text-green-700 font-medium">
                {fix.review_state}
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Analysis</div>
                <div className="text-gray-900 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100">
                  {fix.analysis}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Probable Root Cause</div>
                <div className="text-gray-900 font-medium bg-red-50 p-4 rounded-lg border border-red-100">
                  ! {fix.probable_cause}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Proposed Fix</div>
                <div className="text-gray-900 bg-green-50 p-4 rounded-lg border border-green-100 leading-relaxed">
                  {fix.proposed_fix}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">Patch Notes (Ready for PR)</div>
                <div className="font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded-lg whitespace-pre-wrap">
                  {fix.patch_notes}
                </div>
              </div>

              {reviewAssigned && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  <span>&gt;</span>
                  <span>Fix assigned to senior-engineer@company.com for review</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={assignForReview}
                  disabled={assigningReview || reviewAssigned}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {assigningReview ? '> Assigning...' : reviewAssigned ? '> Assigned for Review' : '> Assign for Review'}
                </button>
                <button className="px-6 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-200">
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-gray-500 mb-1">Context Reconstruction</div>
              <div className="text-2xl font-semibold text-gray-900">
                0 min
              </div>
              <div className="text-xs text-green-600">vs 30-60 min traditional</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Root Cause ID</div>
              <div className="text-2xl font-semibold text-gray-900">
                {fix ? '3 sec' : '—'}
              </div>
              <div className="text-xs text-green-600">vs 1-2 hours traditional</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Total MTTR</div>
              <div className="text-2xl font-semibold text-gray-900">
                15 min
              </div>
              <div className="text-xs text-green-600">vs 2-4 hours traditional</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
