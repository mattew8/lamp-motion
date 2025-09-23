import { useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLampMotionContext } from "./context";

export interface LampMotionPortalProps {
  children: ReactNode;
  container?: Element | DocumentFragment | null;
}

export function LampMotionPortal({ children, container }: LampMotionPortalProps) {
  const { shouldRenderPortal } = useLampMotionContext("Portal");

  const target = useMemo(() => {
    if (container) return container;
    if (typeof document === "undefined") return null;
    return document.body;
  }, [container]);

  if (!shouldRenderPortal || !target) {
    return null;
  }

  return createPortal(children, target);
}
