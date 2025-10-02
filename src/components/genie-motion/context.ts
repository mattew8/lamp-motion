import { createContext, useContext } from "react";

export type GenieMotionContextValue = {
  isOpen: boolean;
  origin: DOMRect | null;
  open: (element: HTMLElement) => void;
  close: () => void;
};

export const GenieMotionContext = createContext<GenieMotionContextValue | null>(null);

export function useGenieMotionContext(componentName: string): GenieMotionContextValue {
  const context = useContext(GenieMotionContext);
  if (!context) {
    throw new Error(`<GenieMotion.${componentName}> must be used within <GenieMotion>`);
  }
  return context;
}
