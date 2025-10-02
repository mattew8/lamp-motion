import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { GenieMotionContext } from "./context";

export const GENIE_EASING = "cubic-bezier(0.25, 1, 0.5, 1)";
export const GENIE_DURATION_MS = 600;
export const GENIE_TRANSITION = [
  `transform ${GENIE_DURATION_MS}ms ${GENIE_EASING}`,
  `clip-path ${GENIE_DURATION_MS}ms ${GENIE_EASING}`,
  "opacity 300ms ease",
].join(", ");

export interface GenieMotionRootProps {
  children: ReactNode;
}

export function GenieMotionRoot({ children }: GenieMotionRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState<DOMRect | null>(null);
  const originElementRef = useRef<HTMLElement | null>(null);

  const readOriginRect = useCallback((element: HTMLElement | null): DOMRect | null => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    // DOMRect is mutable, create a new instance so consumers can rely on snapshots.
    return new DOMRect(rect.x, rect.y, rect.width, rect.height);
  }, []);

  const open = useCallback(
    (element: HTMLElement) => {
      originElementRef.current = element;
      const rect = readOriginRect(element);
      setOrigin(rect);
      setIsOpen(true);
    },
    [readOriginRect],
  );

  const close = useCallback(() => {
    const rect = readOriginRect(originElementRef.current);
    if (rect) {
      setOrigin(rect);
    }
    setIsOpen(false);
  }, [readOriginRect]);

  const value = useMemo(
    () => ({
      isOpen,
      origin,
      open,
      close,
    }),
    [close, isOpen, open, origin],
  );

  return <GenieMotionContext.Provider value={value}>{children}</GenieMotionContext.Provider>;
}
