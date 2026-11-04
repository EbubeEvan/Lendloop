"use client";

import { createContext, type ReactNode, useContext } from "react";

import { useViewer } from "@/hooks/use-viewer";

type Viewer = NonNullable<ReturnType<typeof useViewer>["viewer"]>;

type ViewerContextValue = {
  viewer: Viewer | null;
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const { viewer: rawViewer, isLoading, error, retry } = useViewer();
  const viewer = rawViewer ?? null;

  return (
    <ViewerContext.Provider value={{ viewer, isLoading, error, retry }}>
      {children}
    </ViewerContext.Provider>
  );
}

export function useViewerContext(): ViewerContextValue {
  const context = useContext(ViewerContext);
  if (!context) {
    throw new Error("useViewerContext must be used inside ViewerProvider.");
  }
  return context;
}
