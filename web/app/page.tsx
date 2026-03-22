// AI-Powered Incident Response Platform - Main Dashboard
// Three-column Nexus-style interface showcasing all backend endpoints and AI context linking

'use client';

import { useEffect, useState } from 'react';

const API_BASE = 'https://unflattering-elinor-distinctively.ngrok-free.dev';
const WEBSITE_URL = 'http://localhost:3000';

interface Incident {
  incident_id: string;
  title: string;
  symptoms: string;
  impacted_service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
}

interface Context {
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
  status: string;
  author: string;
  created_at: string;
  merged_at: string | null;
}

interface Deployment {
  deployment_id: string;
  environment: string;
  service_name: string;
  timestamp: string;
  deployed_by: string;
  commit_sha: string;
}

interface IncidentDetail {
  incident_id: string;
  title: string;
  symptoms: string;
  impacted_service: string;
  severity: string;
  status: string;
  created_at: string;
  deployment?: Deployment;
  related_pr?: PR;
  coding_context?: Context;
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

export default function MainDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [fix, setFix] = useState<FixDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewIncidentModal, setShowNewIncidentModal] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [draftingFix, setDraftingFix] = useState(false);
  const [assigningReview, setAssigningReview] = useState(false);

  const [newIncident, setNewIncident] = useState({
    title: '',
    symptoms: '',
    impacted_service: '',
    severity: 'high' as const,
    linked_deployment_id: ''
  });

  const [contextTranscript, setContextTranscript] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // GET /api/incidents - List all incidents
      const incidentsRes = await fetch(`${API_BASE}/api/incidents`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const incidentsData = await incidentsRes.json();
      setIncidents(incidentsData);

      // Load first incident details if exists
      if (incidentsData.length > 0) {
        loadIncidentDetails(incidentsData[0].incident_id);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentDetails = async (incidentId: string) => {
    try {
      // GET /api/incidents/{id} - Get specific incident with full context
      const response = await fetch(`${API_BASE}/api/incidents/${incidentId}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      setSelectedIncident(data);
      setFix(null);
      draftFix(incidentId);
    } catch (error) {
      console.error('Failed to load incident details:', error);
    }
  };

  const triggerIncident = async () => {
    try {
      // POST /api/incidents/trigger - Create new incident
      const response = await fetch(`${API_BASE}/api/incidents/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(newIncident)
      });
      const data = await response.json();
      setShowNewIncidentModal(false);
      loadDashboardData();
      loadIncidentDetails(data.incident_id);
    } catch (error) {
      console.error('Failed to trigger incident:', error);
    }
  };

  const draftFix = async (incidentId?: string) => {
    const id = incidentId ?? selectedIncident?.incident_id;
    if (!id) return;
    setDraftingFix(true);
    try {
      // POST /api/fix/draft - Generate AI fix using coding context
      const response = await fetch(`${API_BASE}/api/fix/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ incident_id: id })
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
      // POST /api/reviews/assign - Assign fix for review
      const response = await fetch(`${API_BASE}/api/reviews/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          draft_id: fix.draft_id,
          reviewer: 'senior-engineer@company.com',
          comment: 'AI-drafted fix ready for review'
        })
      });
      await response.json();
      setFix({ ...fix, review_state: 'in_review' });
    } catch (error) {
      console.error('Failed to assign review:', error);
    } finally {
      setAssigningReview(false);
    }
  };

  const saveContext = async () => {
    try {
      // POST /api/context - Save coding context transcript
      const response = await fetch(`${API_BASE}/api/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ transcript: contextTranscript })
      });
      const data = await response.json();
      setShowContextModal(false);
      setContextTranscript('');
      alert(`Context saved: ${data.context_id}`);
    } catch (error) {
      console.error('Failed to save context:', error);
    }
  };

  const severityColor = (severity: string) => ({
    low: 'bg-blue-50 text-blue-700',
    medium: 'bg-yellow-50 text-yellow-700',
    high: 'bg-orange-50 text-orange-700',
    critical: 'bg-red-50 text-red-700'
  }[severity]);

  const statusColor = (status: string) => ({
    open: 'bg-red-100 text-red-800',
    investigating: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-gray-100 text-gray-800'
  }[status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading platform...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                  N
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Nexus</div>
                  <div className="text-xs text-gray-500">Decision Intelligence</div>
                </div>
              </div>
              <nav className="flex gap-6">
                <button className="text-sm text-gray-600 hover:text-gray-900">Overview</button>
                <button className="text-sm text-gray-600 hover:text-gray-900">Decisions</button>
                <button className="text-sm font-medium text-blue-600 relative">
                  Incidents
                  {incidents.filter(i => i.status === 'open').length > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full inline-flex items-center justify-center">
                      {incidents.filter(i => i.status === 'open').length}
                    </span>
                  )}
                </button>
                <button className="text-sm text-gray-600 hover:text-gray-900">Connections</button>
              </nav>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 text-red-600 text-sm font-medium">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              {incidents.filter(i => i.status === 'open').length} active incident{incidents.filter(i => i.status === 'open').length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar - Incidents List */}
        <div className="w-80 border-r border-gray-200 min-h-screen bg-gray-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Incidents</h2>
              <button
                onClick={() => setShowNewIncidentModal(true)}
                className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                + New
              </button>
            </div>

            <div className="space-y-2">
              {incidents.map((incident) => (
                <button
                  key={incident.incident_id}
                  onClick={() => loadIncidentDetails(incident.incident_id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedIncident?.incident_id === incident.incident_id
                      ? 'bg-white border-blue-200 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColor(incident.status)}`}>
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="font-medium text-sm text-gray-900 mb-1">
                    {incident.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {incident.incident_id} · {new Date(incident.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowContextModal(true)}
              className="w-full mt-4 text-sm px-3 py-2 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 border border-amber-200"
            >
              + Save AI Context
            </button>
          </div>
        </div>

        {/* Center - Main Content */}
        <div className="flex-1 p-6 max-w-4xl">
          {selectedIncident ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  {selectedIncident.title}
                </h1>
                <div className="text-sm text-gray-500 mb-3">
                  {selectedIncident.impacted_service} · PR #{selectedIncident.related_pr?.pr_id} · Opened {new Date(selectedIncident.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${severityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity.toUpperCase()}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${statusColor(selectedIncident.status)}`}>
                    {selectedIncident.status}
                  </span>
                </div>
              </div>

              {/* AI Session Context - THE MAGIC */}
              {selectedIncident.coding_context && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    AI SESSION CONTEXT
                  </div>
                  <div className="bg-white p-4 rounded border border-gray-200 mb-3">
                    <div className="text-sm text-gray-700 italic mb-3">
                      "{selectedIncident.coding_context.summary}"
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        {selectedIncident.coding_context.decisions.length} decisions logged
                      </span>
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        {selectedIncident.coding_context.files_changed.length} files changed
                      </span>
                      <span className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded">
                        {selectedIncident.coding_context.assumptions.length} high-impact decision
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deployment Info */}
              {selectedIncident.deployment && (
                <div className="mb-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    DEPLOYMENT
                  </div>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs">
                    <div className="text-gray-400 mb-2">
                      [{new Date(selectedIncident.deployment.timestamp).toLocaleTimeString()}] Deployment successful → {selectedIncident.deployment.environment}
                    </div>
                    <div className="text-red-400">
                      [{new Date(selectedIncident.created_at).toLocaleTimeString()}] ERROR {selectedIncident.symptoms}
                    </div>
                  </div>
                </div>
              )}

              {/* Linked PR */}
              {selectedIncident.related_pr && (
                <div className="mb-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    LINKED PR
                  </div>
                  <div className="p-4 bg-white border border-gray-200 rounded">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-blue-600">
                          PR #{selectedIncident.related_pr.pr_id} — {selectedIncident.related_pr.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          by {selectedIncident.related_pr.author}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">
                        {selectedIncident.related_pr.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Fix */}
              {draftingFix && !fix && (
                <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-400 animate-pulse">Analyzing with AI...</div>
                  </div>
                  <div className="p-4 space-y-3">
                    {['w-3/4', 'w-full', 'w-5/6'].map((w, i) => (
                      <div key={i} className={`h-4 bg-gray-100 rounded animate-pulse ${w}`} />
                    ))}
                  </div>
                </div>
              )}
              {fix && (
                <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">AI-Drafted Fix</div>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {fix.review_state}
                    </span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2">ANALYSIS</div>
                      <div className="text-sm text-gray-700">{fix.analysis}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2">PROBABLE CAUSE</div>
                      <div className="text-sm text-red-700 bg-red-50 p-3 rounded">{fix.probable_cause}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2">PROPOSED FIX</div>
                      <div className="text-sm text-gray-700">{fix.proposed_fix}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-2">PATCH NOTES</div>
                      <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs whitespace-pre-wrap">
                        {fix.patch_notes}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {fix && (
                <button
                  onClick={assignForReview}
                  disabled={assigningReview || fix.review_state === 'in_review'}
                  className="w-full py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:bg-gray-400"
                >
                  {assigningReview ? 'Assigning...' : fix.review_state === 'in_review' ? 'Assigned for Review' : 'Assign for Review'}
                </button>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Select an incident to view details
            </div>
          )}
        </div>

        {/* Right Sidebar - Responder & Timeline */}
        <div className="w-80 border-l border-gray-200 bg-gray-50 p-4">
          {selectedIncident && (
            <>
              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  RESPONDER
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {selectedIncident.related_pr?.author?.[0]?.toUpperCase() || 'JC'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedIncident.related_pr?.author || 'James Chen'}
                    </div>
                    <div className="text-xs text-gray-500">AI suggested</div>
                  </div>
                </div>
                {selectedIncident.coding_context && (
                  <div className="mt-3 text-xs text-gray-600 bg-white p-3 rounded border border-gray-200">
                    Authored the {selectedIncident.related_pr?.title} in session and has full context of the changes.
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  TIMELINE
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs flex-shrink-0">
                      1
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">AI session</div>
                      <div className="text-xs text-gray-500">
                        {selectedIncident.coding_context ? new Date(selectedIncident.coding_context.session_timestamp).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">PR #{selectedIncident.related_pr?.pr_id}</div>
                      <div className="text-xs text-gray-500">
                        {selectedIncident.related_pr ? new Date(selectedIncident.related_pr.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs flex-shrink-0">
                      ▲
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Deployed</div>
                      <div className="text-xs text-gray-500">
                        {selectedIncident.deployment ? new Date(selectedIncident.deployment.timestamp).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs flex-shrink-0">
                      !
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Incident</div>
                      <div className="text-xs text-gray-500">
                        {new Date(selectedIncident.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  ACTIONS
                </div>
                <div className="space-y-2">
                  <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2 px-3 rounded hover:bg-white transition-colors">
                    &gt; Open PR on GitHub
                  </button>
                  <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 py-2 px-3 rounded hover:bg-white transition-colors flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Rollback on Vercel
                  </button>
                  <a
                    href={`${WEBSITE_URL}/${selectedIncident.incident_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-left text-sm text-blue-600 hover:text-blue-700 py-2 px-3 rounded hover:bg-white transition-colors block"
                  >
                    &gt; View in Slack
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Incident Modal */}
      {showNewIncidentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Trigger New Incident</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Title</label>
                <input
                  type="text"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Payment service timeout errors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Symptoms</label>
                <textarea
                  value={newIncident.symptoms}
                  onChange={(e) => setNewIncident({ ...newIncident, symptoms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="30% of webhook calls timing out"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Service</label>
                <input
                  type="text"
                  value={newIncident.impacted_service}
                  onChange={(e) => setNewIncident({ ...newIncident, impacted_service: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="payment-webhook-service"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Linked Deployment ID</label>
                <input
                  type="text"
                  value={newIncident.linked_deployment_id}
                  onChange={(e) => setNewIncident({ ...newIncident, linked_deployment_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="deploy-abc123"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={triggerIncident}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Trigger Incident
              </button>
              <button
                onClick={() => setShowNewIncidentModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Context Modal */}
      {showContextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save AI Coding Context</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Session Transcript
                </label>
                <textarea
                  value={contextTranscript}
                  onChange={(e) => setContextTranscript(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                  rows={8}
                  placeholder="Paste your Claude coding session notes or transcript here..."
                />
                <div className="text-xs text-gray-500 mt-1">
                  AI will extract decisions, assumptions, and file changes
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={saveContext}
                disabled={!contextTranscript.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:bg-gray-400"
              >
                Save Context
              </button>
              <button
                onClick={() => setShowContextModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
