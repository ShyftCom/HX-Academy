"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface StationContextValue {
  activeStationId: string | null;
  setActiveStationId: (id: string | null) => void;
  isGlobalView: boolean;
}

const StationContext = createContext<StationContextValue>({
  activeStationId: null,
  setActiveStationId: () => {},
  isGlobalView: true,
});

export function StationProvider({ children }: { children: React.ReactNode }) {
  const [activeStationId, setActiveStationIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("active_station_id");
    if (stored) setActiveStationIdState(stored);
  }, []);

  const setActiveStationId = (id: string | null) => {
    setActiveStationIdState(id);
    if (id) {
      localStorage.setItem("active_station_id", id);
    } else {
      localStorage.removeItem("active_station_id");
    }
  };

  return (
    <StationContext.Provider value={{ activeStationId, setActiveStationId, isGlobalView: activeStationId === null }}>
      {children}
    </StationContext.Provider>
  );
}

export function useStation() {
  return useContext(StationContext);
}
