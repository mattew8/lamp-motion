import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactElement,
} from "react";
import { useLampMotionContext } from "./context";
import { GENIE_TRANSITION } from "./LampMotionRoot";
import { buildGeniePath, calculateGenieMetrics, mergeRefs, supportsClipPathPath } from "./utils";
import type { GenieMetrics } from "./utils";

type AnimationState = "idle" | "opening" | "settling" | "closing";

const IDENTITY_TRANSFORM = "scale(1, 1) translate3d(0px, 0px, 0px) skewY(0deg)";
const TRANSFORM_PROPERTY = "transform";
const OVERSHOOT_TRANSITION = "transform 200ms ease-out";
const OVERSHOOT_SCALE = 1.02;
const INITIAL_SCALE = 0.96;
const INITIAL_TRANSLATE_FACTOR = 0.18;
const INITIAL_SKEW_DEG = 2;

// Keep JS-driven clip-path morph in sync with transform duration (should match GENIE_TRANSITION timing)
const GENIE_DURATION_MS = 600;
const TRANSITION_WITHOUT_CLIP = `transform ${GENIE_DURATION_MS}ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease`;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Animate clip-path by driving the path string with rAF.
 * This avoids relying on CSS path interpolation support and lets us sculpt the "neck".
 */
function animateClipPath(
  node: HTMLElement,
  metrics: GenieMetrics,
  direction: "open" | "close",
  scheduleRaf: (cb: FrameRequestCallback) => number,
) {
  const supportsPath = supportsClipPathPath();
  const start = performance.now();

  const tick = (now: number) => {
    const raw = (now - start) / GENIE_DURATION_MS;
    const eased = easeOutCubic(clamp01(raw));
    const u = direction === "open" ? eased : 1 - eased;

    if (supportsPath) {
      const path = buildGeniePath(metrics, u);
      node.style.clipPath = path;
      if (process.env.NODE_ENV !== "production") {
        console.log("[LampMotion] clip-path", path);
      }
    } else {
      const r = lerp(metrics.originRadius, metrics.expandedRadius, u);
      node.style.clipPath = buildCircle(r, metrics.originX, metrics.originY);
    }

    if (raw < 1) {
      scheduleRaf(tick);
    }
  };

  // kick
  scheduleRaf(tick);
}

export interface LampMotionContentProps {
  children: ReactElement;
}

export function LampMotionContent({ children }: LampMotionContentProps) {
  const { isOpen, origin, close } = useLampMotionContext("Content");
  const contentRef = useRef<HTMLElement | null>(null);
  const animationStateRef = useRef<AnimationState>("idle");
  const previousIsOpenRef = useRef(false);
  const rafIdsRef = useRef<number[]>([]);

  const flushRafs = useCallback(() => {
    rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
    rafIdsRef.current = [];
  }, []);

  const scheduleRaf = useCallback((cb: FrameRequestCallback) => {
    const id = requestAnimationFrame(cb);
    rafIdsRef.current.push(id);
    return id;
  }, []);

  const restoreRestingStyles = useCallback((node: HTMLElement) => {
    node.style.transition = "";
    node.style.willChange = "";
    node.style.pointerEvents = "";
    node.style.transformOrigin = "";
    node.style.transform = "";
    node.style.clipPath = "";
    node.style.opacity = "";
  }, []);

  const playOpen = useCallback(
    (node: HTMLElement) => {
      if (!origin) {
        restoreRestingStyles(node);
        animationStateRef.current = "idle";
        return;
      }

      flushRafs();

      const targetRect = node.getBoundingClientRect();
      const metrics = calculateGenieMetrics(origin, targetRect);
      const supportsPath = supportsClipPathPath();

      // transform-origin must be relative to the element's box, not the viewport
      const localOriginX = metrics.originX - targetRect.left;
      const localOriginY = metrics.originY - targetRect.top;

      const startClip = supportsPath
        ? buildGeniePath(metrics, 0)
        : buildCircle(metrics.originRadius, metrics.originX, metrics.originY);

      animationStateRef.current = "opening";
      node.style.willChange = "transform, clip-path, opacity";
      node.style.pointerEvents = "none";
      node.style.transformOrigin = `${localOriginX}px ${localOriginY}px`;
      node.style.transition = "none";
      node.style.opacity = "0";
      node.style.clipPath = startClip;
      node.style.transform = buildOpenTransform(metrics, true);

      scheduleRaf(() => {
        scheduleRaf(() => {
          // Transition transform/opacity only — clip-path is JS-driven for precise 'neck' shaping
          node.style.transition = TRANSITION_WITHOUT_CLIP;
          node.style.opacity = "1";
          node.style.transform = buildOpenTransform(metrics, false);

          // Drive the clip-path with rAF along the Genie curve
          animateClipPath(node, metrics, "open", scheduleRaf);
        });
      });
    },
    [flushRafs, origin, restoreRestingStyles, scheduleRaf],
  );

  const playClose = useCallback(
    (node: HTMLElement) => {
      if (!origin) {
        animationStateRef.current = "idle";
        restoreRestingStyles(node);
        return;
      }

      flushRafs();

      const targetRect = node.getBoundingClientRect();
      const metrics = calculateGenieMetrics(origin, targetRect);
      const supportsPath = supportsClipPathPath();

      // transform-origin must be relative to the element's box
      const localOriginX = metrics.originX - targetRect.left;
      const localOriginY = metrics.originY - targetRect.top;

      const startClip = supportsPath
        ? buildGeniePath(metrics, 1)
        : buildCircle(metrics.expandedRadius, metrics.originX, metrics.originY);

      animationStateRef.current = "closing";
      node.style.willChange = "transform, clip-path, opacity";
      node.style.pointerEvents = "none";
      node.style.transformOrigin = `${localOriginX}px ${localOriginY}px`;
      // Transition transform/opacity only
      node.style.transition = TRANSITION_WITHOUT_CLIP;
      node.style.opacity = "1";
      node.style.clipPath = startClip;
      node.style.transform = IDENTITY_TRANSFORM;

      scheduleRaf(() => {
        // Drive the clip-path back to the origin while we transform towards it
        animateClipPath(node, metrics, "close", scheduleRaf);
        node.style.opacity = "0";
        node.style.transform = buildCloseTransform(metrics);
      });
    },
    [flushRafs, origin, restoreRestingStyles, scheduleRaf],
  );

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node || !origin) return;

    const wasOpen = previousIsOpenRef.current;
    if (isOpen && !wasOpen) {
      playOpen(node);
    } else if (!isOpen && wasOpen) {
      playClose(node);
    }
    previousIsOpenRef.current = isOpen;
  }, [isOpen, origin, playClose, playOpen]);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== node) return;
      if (event.propertyName !== TRANSFORM_PROPERTY) return;

      const state = animationStateRef.current;
      if (state === "opening") {
        animationStateRef.current = "settling";
        node.style.transition = OVERSHOOT_TRANSITION;
        node.style.transform = IDENTITY_TRANSFORM;
        node.style.pointerEvents = "";
        node.style.clipPath = "";
        return;
      }

      animationStateRef.current = "idle";
      restoreRestingStyles(node);
    };

    node.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      node.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [restoreRestingStyles]);

  useEffect(
    () => () => {
      flushRafs();
    },
    [flushRafs],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, isOpen]);

  if (!isValidElement(children)) {
    throw new Error("<LampMotion.Content> expects a single React element child.");
  }

  return cloneElement(children, {
    ref: mergeRefs(children.ref, contentRef),
    role: children.props.role ?? "dialog",
    "aria-modal": children.props["aria-modal"] ?? true,
    "data-lamp-motion-state": isOpen ? "open" : "closed",
  });
}

function buildOpenTransform(metrics: GenieMetrics, isInitial: boolean): string {
  if (isInitial) {
    const translateX = metrics.translateX * INITIAL_TRANSLATE_FACTOR;
    const translateY = metrics.translateY * INITIAL_TRANSLATE_FACTOR;
    return `translate3d(${translateX}px, ${translateY}px, 0px) scale(${INITIAL_SCALE}, ${INITIAL_SCALE}) skewY(${INITIAL_SKEW_DEG}deg)`;
  }
  return `scale(${OVERSHOOT_SCALE}, ${OVERSHOOT_SCALE}) translate3d(0px, 0px, 0px) skewY(0deg)`;
}

function buildCloseTransform(metrics: GenieMetrics): string {
  return `scale(${metrics.scaleX}, ${metrics.scaleY}) translate3d(${metrics.translateX}px, ${metrics.translateY}px, 0px) skewY(-3deg)`;
}

function buildCircle(radius: number, x: number, y: number): string {
  const safeRadius = Number.isFinite(radius) ? Math.max(radius, 1) : 1;
  return `circle(${safeRadius}px at ${x}px ${y}px)`;
}
