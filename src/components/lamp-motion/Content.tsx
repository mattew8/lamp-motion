import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { useLampMotionContext } from "./context";
import { calculateGenieMetrics, mergeRefs } from "./utils";
import type { GenieMetrics } from "./utils";
import { captureElementToImage } from "./webgl/capture";
import { canUseWebGL, playGenie } from "./webgl/renderer";
import type { GeniePlayOptions } from "./webgl/types";

type AnimationState = "idle" | "opening" | "closing";

const IDENTITY_TRANSFORM = "translate3d(0px, 0px, 0px) scale(1, 1) skewY(0deg)";

interface GenieGLParams {
  duration?: number;
  rows?: number;
  cols?: number;
  neckMin?: number;
  neckMaxRatio?: number;
  curveStrengthRatio?: number;
}

const DEFAULT_GL_PARAMS: Required<GenieGLParams> = {
  duration: 720,
  rows: 72,
  cols: 24,
  neckMin: 6,
  neckMaxRatio: 0.42,
  curveStrengthRatio: 0.16,
};

interface ProcessLike {
  env?: { NODE_ENV?: string };
}

function isDevEnvironment(): boolean {
  const globalProcess = (globalThis as { process?: ProcessLike }).process;
  return globalProcess?.env?.NODE_ENV !== "production";
}

export interface LampMotionContentProps {
  children: ReactElement;
  glParams?: GenieGLParams;
}

export function LampMotionContent({ children, glParams }: LampMotionContentProps) {
  const { isOpen, origin, close } = useLampMotionContext("Content");
  const contentRef = useRef<HTMLElement | null>(null);
  const animationStateRef = useRef<AnimationState>("idle");
  const previousIsOpenRef = useRef(false);
  const rafIdsRef = useRef<number[]>([]);
  const settleTimeoutRef = useRef<number | null>(null);
  const lastMetricsRef = useRef<GenieMetrics | null>(null);
  const contentInnerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const webglSupportRef = useRef<boolean | null>(null);
  const webglCancelRef = useRef<(() => void) | null>(null);
  const operationIdRef = useRef(0);
  const originalPositionRef = useRef<string | null>(null);
  const resolvedGlParams = useMemo<Required<GenieGLParams>>(
    () => ({
      ...DEFAULT_GL_PARAMS,
      ...(glParams ?? {}),
    }),
    [glParams],
  );

  const logWebGLIssue = useCallback((stage: string, detail?: unknown) => {
    if (!isDevEnvironment() || typeof console === "undefined") return;
    if (detail instanceof Error) {
      console.warn(`[LampMotion] WebGL ${stage}`, detail);
      return;
    }
    if (detail !== undefined) {
      console.warn(`[LampMotion] WebGL ${stage}`, detail);
      return;
    }
    console.warn(`[LampMotion] WebGL ${stage}`);
  }, []);

  const flushRafs = useCallback(() => {
    rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
    rafIdsRef.current = [];
  }, []);

  const clearSettleTimeout = useCallback(() => {
    const timeoutId = settleTimeoutRef.current;
    if (timeoutId != null) {
      window.clearTimeout(timeoutId);
      settleTimeoutRef.current = null;
    }
  }, []);

  const restoreRestingStyles = useCallback(
    (node: HTMLElement, options?: { keepOpacityZero?: boolean }) => {
      node.style.transition = "";
      node.style.willChange = "";
      node.style.pointerEvents = "";
      node.style.transformOrigin = "";
      node.style.transform = IDENTITY_TRANSFORM;
      node.style.clipPath = "";
      node.style.opacity = options?.keepOpacityZero ? "0" : "";
    },
    [],
  );

  const showInnerContent = useCallback(() => {
    const inner = contentInnerRef.current;
    if (!inner) return;
    inner.style.visibility = "";
    inner.style.opacity = "";
    inner.style.pointerEvents = "";
    inner.removeAttribute("aria-hidden");
  }, []);

  const hideInnerContent = useCallback(() => {
    const inner = contentInnerRef.current;
    if (!inner) return;
    inner.style.visibility = "hidden";
    inner.style.opacity = "0";
    inner.style.pointerEvents = "none";
    inner.setAttribute("aria-hidden", "true");
  }, []);

  const showOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.style.display = "block";
    overlay.style.opacity = "1";
  }, []);

  const hideOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.style.opacity = "0";
    overlay.style.display = "none";
    if (canvasRef.current && canvasRef.current.parentElement === overlay) {
      overlay.removeChild(canvasRef.current);
      canvasRef.current = null;
    }
  }, []);

  const ensureRelativePositioning = useCallback(() => {
    const node = contentRef.current;
    if (!node) return;
    const computed = window.getComputedStyle(node);
    if (computed.position === "static") {
      originalPositionRef.current ??= node.style.position;
      node.style.position = "relative";
    }
  }, []);

  const restorePositioning = useCallback(() => {
    const node = contentRef.current;
    if (!node) return;
    if (originalPositionRef.current != null) {
      node.style.position = originalPositionRef.current;
      originalPositionRef.current = null;
    }
  }, []);

  const ensureCanvas = useCallback((rect: DOMRect, pixelRatio: number) => {
    const overlay = overlayRef.current;
    if (!overlay) return null;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.pointerEvents = "none";
      overlay.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    return canvas;
  }, []);

  const stopWebGL = useCallback(
    (options?: { restoreContent?: boolean }) => {
      const cancel = webglCancelRef.current;
      if (cancel) {
        cancel();
        webglCancelRef.current = null;
      }
      hideOverlay();
      if (options?.restoreContent !== false) {
        showInnerContent();
      }
      restorePositioning();
      if (contentRef.current) {
        contentRef.current.style.pointerEvents = "";
      }
    },
    [hideOverlay, restorePositioning, showInnerContent],
  );

  const getSupportsWebGL = useCallback(() => {
    webglSupportRef.current ??= canUseWebGL();
    return webglSupportRef.current;
  }, []);

  const playOpenWebGL = useCallback(
    async (node: HTMLElement, opId: number): Promise<boolean> => {
      if (!origin) {
        logWebGLIssue("open aborted: missing origin");
        return false;
      }
      if (!getSupportsWebGL()) {
        logWebGLIssue("open aborted: WebGL unsupported");
        return false;
      }
      const inner = contentInnerRef.current;
      if (!inner) {
        logWebGLIssue("open aborted: missing inner content");
        return false;
      }

      flushRafs();
      clearSettleTimeout();
      stopWebGL();

      const targetRect = node.getBoundingClientRect();
      const metrics = calculateGenieMetrics(origin, targetRect);
      lastMetricsRef.current = metrics;

      const pixelRatio =
        typeof window !== "undefined" && Number.isFinite(window.devicePixelRatio)
          ? window.devicePixelRatio
          : 1;

      showInnerContent();
      hideOverlay();
      ensureRelativePositioning();
      node.style.pointerEvents = "none";

      try {
        const image = await captureElementToImage(inner, pixelRatio);
        if (operationIdRef.current !== opId) {
          stopWebGL();
          return true;
        }

        const rect = node.getBoundingClientRect();
        const canvas = ensureCanvas(rect, pixelRatio);
        if (!canvas) {
          logWebGLIssue("open aborted: canvas unavailable");
          stopWebGL();
          return false;
        }

        hideInnerContent();
        showOverlay();
        animationStateRef.current = "opening";

        const options = buildGeniePlayOptions(metrics, rect, "open", resolvedGlParams, pixelRatio);
        logWebGLIssue("open starting", {
          size: options.size,
          rows: options.rows,
          cols: options.cols,
          curveStrength: options.curveStrength,
          neck: options.neck,
        });
        const dispose = playGenie(canvas, image, {
          ...options,
          onDone: () => {
            if (operationIdRef.current !== opId) return;
            animationStateRef.current = "idle";
            stopWebGL();
            restoreRestingStyles(node);
          },
        });
        webglCancelRef.current = dispose;
        return true;
      } catch (error) {
        logWebGLIssue("open animation failed", error);
        stopWebGL();
        return false;
      }
    },
    [
      origin,
      getSupportsWebGL,
      flushRafs,
      clearSettleTimeout,
      stopWebGL,
      showInnerContent,
      hideOverlay,
      ensureRelativePositioning,
      ensureCanvas,
      hideInnerContent,
      showOverlay,
      resolvedGlParams,
      restoreRestingStyles,
      logWebGLIssue,
    ],
  );

  const playCloseWebGL = useCallback(
    async (node: HTMLElement, opId: number): Promise<boolean> => {
      if (!origin) {
        logWebGLIssue("close aborted: missing origin");
        return false;
      }
      if (!getSupportsWebGL()) {
        logWebGLIssue("close aborted: WebGL unsupported");
        return false;
      }
      const inner = contentInnerRef.current;
      if (!inner) {
        logWebGLIssue("close aborted: missing inner content");
        return false;
      }

      flushRafs();
      clearSettleTimeout();
      stopWebGL();

      const targetRect = node.getBoundingClientRect();
      const metrics = calculateGenieMetrics(origin, targetRect);
      lastMetricsRef.current = metrics;

      const pixelRatio =
        typeof window !== "undefined" && Number.isFinite(window.devicePixelRatio)
          ? window.devicePixelRatio
          : 1;

      showInnerContent();
      hideOverlay();
      ensureRelativePositioning();
      node.style.pointerEvents = "none";

      try {
        const image = await captureElementToImage(inner, pixelRatio);
        if (operationIdRef.current !== opId) {
          stopWebGL({ restoreContent: false });
          return true;
        }

        const rect = node.getBoundingClientRect();
        const canvas = ensureCanvas(rect, pixelRatio);
        if (!canvas) {
          logWebGLIssue("close aborted: canvas unavailable");
          stopWebGL({ restoreContent: false });
          return false;
        }

        hideInnerContent();
        showOverlay();
        animationStateRef.current = "closing";

        const options = buildGeniePlayOptions(metrics, rect, "close", resolvedGlParams, pixelRatio);
        logWebGLIssue("close starting", {
          size: options.size,
          rows: options.rows,
          cols: options.cols,
          curveStrength: options.curveStrength,
          neck: options.neck,
        });
        const dispose = playGenie(canvas, image, {
          ...options,
          onDone: () => {
            if (operationIdRef.current !== opId) return;
            animationStateRef.current = "idle";
            stopWebGL({ restoreContent: false });
            restoreRestingStyles(node, { keepOpacityZero: true });
          },
        });
        webglCancelRef.current = dispose;
        return true;
      } catch (error) {
        logWebGLIssue("close animation failed", error);
        stopWebGL({ restoreContent: false });
        return false;
      }
    },
    [
      origin,
      getSupportsWebGL,
      flushRafs,
      clearSettleTimeout,
      stopWebGL,
      showInnerContent,
      hideOverlay,
      ensureRelativePositioning,
      ensureCanvas,
      hideInnerContent,
      showOverlay,
      resolvedGlParams,
      restoreRestingStyles,
      logWebGLIssue,
    ],
  );

  const attemptPlayOpen = useCallback(
    async (node: HTMLElement, opId: number) => {
      const played = await playOpenWebGL(node, opId);
      if (operationIdRef.current !== opId) return;
      if (!played && isDevEnvironment() && typeof console !== "undefined") {
        console.warn("[LampMotion] WebGL open failed; Genie animation not played.");
      }
    },
    [playOpenWebGL],
  );

  const attemptPlayClose = useCallback(
    async (node: HTMLElement, opId: number) => {
      const played = await playCloseWebGL(node, opId);
      if (operationIdRef.current !== opId) return;
      if (!played && isDevEnvironment() && typeof console !== "undefined") {
        console.warn("[LampMotion] WebGL close failed; Genie animation not played.");
      }
    },
    [playCloseWebGL],
  );

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const wasOpen = previousIsOpenRef.current;

    if (isOpen === wasOpen) return;

    const opId = operationIdRef.current + 1;
    operationIdRef.current = opId;

    if (isOpen) {
      void attemptPlayOpen(node, opId);
    } else {
      void attemptPlayClose(node, opId);
    }

    previousIsOpenRef.current = isOpen;
    return () => {
      operationIdRef.current += 1;
      stopWebGL();
    };
  }, [attemptPlayClose, attemptPlayOpen, isOpen, stopWebGL]);

  useEffect(() => {
    return () => {
      flushRafs();
      clearSettleTimeout();
      stopWebGL();
    };
  }, [clearSettleTimeout, flushRafs, stopWebGL]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, [close, isOpen]);

  if (!isValidElement(children)) {
    throw new Error("<LampMotion.Content> expects a single React element child.");
  }

  type ChildWithOptionalRef = ReactElement<Record<string, unknown>> & {
    ref?: Ref<HTMLElement>;
  };
  const child = children as ChildWithOptionalRef;
  const childProps: Record<string, unknown> = child.props ?? {};
  const originalChildren = childProps.children as ReactNode;

  const contentWrapperStyle: CSSProperties = {
    position: "relative",
    zIndex: 1,
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    display: "none",
    overflow: "hidden",
    zIndex: 2147483000,
  };

  return cloneElement(child, {
    ref: mergeRefs<HTMLElement>(child.ref, contentRef),
    role: (childProps.role as string | undefined) ?? "dialog",
    "aria-modal": (childProps["aria-modal"] as boolean | undefined) ?? true,
    "data-lamp-motion-state": isOpen ? "open" : "closed",
    children: (
      <>
        <div ref={contentInnerRef} data-lamp-motion-content style={contentWrapperStyle}>
          {originalChildren}
        </div>
        <div ref={overlayRef} aria-hidden="true" data-lamp-motion-overlay style={overlayStyle} />
      </>
    ),
  });
}

function buildGeniePlayOptions(
  metrics: GenieMetrics,
  rect: DOMRectReadOnly,
  direction: "open" | "close",
  params: Required<GenieGLParams>,
  pixelRatio: number,
): GeniePlayOptions {
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const size = {
    w: Math.max(1, Math.round(width * pixelRatio)),
    h: Math.max(1, Math.round(height * pixelRatio)),
  };

  const originLocal = {
    x: metrics.originX * pixelRatio,
    y: metrics.originY * pixelRatio,
  };

  const directionVec = normalizeDirection(metrics.angle);
  const minDimension = Math.max(1, Math.min(width, height));
  const neckMin = Math.max(1, params.neckMin) * pixelRatio;
  const neckMax = Math.max(neckMin, minDimension * params.neckMaxRatio * pixelRatio);
  const curveStrength = Math.max(0, height * params.curveStrengthRatio * pixelRatio);
  const dynamicCols = Math.max(params.cols, Math.ceil(width / 48));
  const dynamicRows = Math.max(params.rows, Math.ceil(height / 10));

  return {
    duration: params.duration,
    direction,
    originLocal,
    size,
    directionVec,
    neck: {
      min: neckMin,
      max: neckMax,
    },
    curveStrength,
    cols: Math.max(1, Math.floor(dynamicCols)),
    rows: Math.max(1, Math.floor(dynamicRows)),
  };
}

function normalizeDirection(angle: number) {
  if (!Number.isFinite(angle)) {
    return { x: 0, y: -1 };
  }
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  const length = Math.hypot(x, y);
  if (length === 0) {
    return { x: 0, y: -1 };
  }
  return { x: x / length, y: y / length };
}
