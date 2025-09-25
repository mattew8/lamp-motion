import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLampMotionContext } from "./context";
import { GENIE_DURATION_MS } from "./LampMotionRoot";

export interface LampMotionPortalProps {
  children: ReactNode;
  container?: Element | DocumentFragment | null;
}

export function LampMotionPortal({ children, container }: LampMotionPortalProps) {
  const { isOpen } = useLampMotionContext("Portal");
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return;
    }

    let timeoutId: number | undefined;
    if (typeof window !== "undefined") {
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
      }, GENIE_DURATION_MS + 32);
    } else {
      setShouldRender(false);
    }

    return () => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOpen]);

  const target = useMemo(() => {
    if (container) return container;
    if (typeof document === "undefined") return null;
    return document.body;
  }, [container]);

  if (!shouldRender || !target) {
    return null;
  }

  return createPortal(children, target);
}
