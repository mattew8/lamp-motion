import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { LampMotionContext, type LampMotionContextValue, type Rect } from "./context";

interface LampMotionRootProps {
  children: ReactNode;
}

const EASING = "cubic-bezier(0.25, 1, 0.5, 1)";
const DURATION_MS = 320;

export const TRANSITION = `transform ${DURATION_MS}ms ${EASING}`;
export const TRANSITION_DURATION_MS = DURATION_MS;

function readRect(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function rectsAreEqual(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

export function LampMotionRoot({ children }: LampMotionRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldRenderPortal, setShouldRenderPortal] = useState(false);
  const [originRect, setOriginRect] = useState<Rect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const originElementRef = useRef<HTMLElement | null>(null);
  const originRectRef = useRef<Rect | null>(null);

  const open = useCallback((element: HTMLElement) => {
    originElementRef.current = element;
    const rect = readRect(element);
    originRectRef.current = rect;
    setOriginRect(rect);
    setShouldRenderPortal(true);
    setIsOpen(true);
  }, []);

  const measureOriginRect = useCallback(() => {
    const element = originElementRef.current;
    if (!element) return originRectRef.current;
    const rect = readRect(element);
    if (!rectsAreEqual(originRectRef.current, rect)) {
      originRectRef.current = rect;
      setOriginRect(rect);
    }
    return rect;
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    measureOriginRect();
  }, [measureOriginRect]);

  const commitClose = useCallback(() => {
    setShouldRenderPortal(false);
    setIsAnimating(false);
  }, []);

  const beginAnimation = useCallback(() => {
    setIsAnimating(true);
  }, []);

  const endAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const value = useMemo<LampMotionContextValue>(
    () => ({
      isOpen,
      isAnimating,
      shouldRenderPortal,
      originRect,
      open,
      close,
      measureOriginRect,
      commitClose,
      beginAnimation,
      endAnimation,
    }),
    [beginAnimation, close, commitClose, endAnimation, isOpen, isAnimating, originRect, open, shouldRenderPortal],
  );

  return <LampMotionContext.Provider value={value}>{children}</LampMotionContext.Provider>;
}
