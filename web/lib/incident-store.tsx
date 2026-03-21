"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { THE_INCIDENT, type Incident } from "./mock-data";

const STORAGE_KEY = "nexus_incident_triggered";

type IncidentStore = {
  incident: Incident | null;
  triggerIncident: () => void;
  resolveIncident: () => void;
};

const IncidentContext = createContext<IncidentStore>({
  incident: null,
  triggerIncident: () => {},
  resolveIncident: () => {},
});

export function IncidentProvider({ children }: { children: ReactNode }) {
  const [incident, setIncident] = useState<Incident | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setIncident({ ...THE_INCIDENT, triggered_at: new Date().toISOString() });
      }
    } catch {
      // ignore
    }
  }, []);

  function triggerIncident() {
    const active = { ...THE_INCIDENT, triggered_at: new Date().toISOString() };
    setIncident(active);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore
    }
  }

  function resolveIncident() {
    setIncident(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return (
    <IncidentContext.Provider value={{ incident, triggerIncident, resolveIncident }}>
      {children}
    </IncidentContext.Provider>
  );
}

export function useIncident() {
  return useContext(IncidentContext);
}
