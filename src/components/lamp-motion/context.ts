import { createContext, useContext } from "react";

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface LampMotionContextValue {
  isOpen: boolean;
  isAnimating: boolean;
  shouldRenderPortal: boolean;
  originRect: Rect | null;
  open: (element: HTMLElement) => void;
  close: () => void;
  measureOriginRect: () => Rect | null;
  commitClose: () => void;
  beginAnimation: () => void;
  endAnimation: () => void;
}

export const LampMotionContext = createContext<LampMotionContextValue | null>(null);

export function useLampMotionContext(componentName: string): LampMotionContextValue {
  const context = useContext(LampMotionContext);
  if (!context) {
    throw new Error(`<LampMotion.${componentName}> must be used within <LampMotion>`);
  }
  return context;
}
