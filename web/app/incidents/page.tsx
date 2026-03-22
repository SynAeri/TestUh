// Incidents List Page
// Shows all incidents with links to detail pages

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = 'https://unflattering-elinor-distinctively.ngrok-free.dev';

interface Incident {
  incident_id: string;
  title: string;
  symptoms: string;
  impacted_service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  created_at: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/incidents`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await response.json();
      setIncidents(data.incidents || []);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (severity: string) => ({
    low: 'bg-blue-50 text-blue-700 border-blue-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
    critical: 'bg-red-50 text-red-700 border-red-200'
  }[severity] || 'bg-gray-50 text-gray-700 border-gray-200');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center">
        <div className="text-gray-500">Loading incidents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-gray-900 mb-2">
            Incidents
          </h1>
          <p className="text-gray-500">
            Production incidents linked to AI coding context
          </p>
        </div>

        {incidents.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Incidents
            </h2>
            <p className="text-gray-600">
              No incidents have been triggered yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <Link
                key={incident.incident_id}
                href={`/incidents/${incident.incident_id}`}
                className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {incident.title}
                    </h3>
                    <p className="text-sm text-gray-600">{incident.symptoms}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-medium border ${severityColor(incident.severity)}`}>
                      {incident.severity.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {incident.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="font-mono">{incident.incident_id}</span>
                  <span>•</span>
                  <span>{incident.impacted_service}</span>
                  <span>•</span>
                  <span>{new Date(incident.created_at).toLocaleString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
