import { createContext, useContext } from "react";

export type LampMotionContextValue = {
  isOpen: boolean;
  origin: DOMRect | null;
  open: (element: HTMLElement) => void;
  close: () => void;
};

export const LampMotionContext = createContext<LampMotionContextValue | null>(null);

export function useLampMotionContext(componentName: string): LampMotionContextValue {
  const context = useContext(LampMotionContext);
  if (!context) {
    throw new Error(`<LampMotion.${componentName}> must be used within <LampMotion>`);
  }
  return context;
}
