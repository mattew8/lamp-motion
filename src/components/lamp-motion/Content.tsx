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
import { calculateTransform, mergeRefs, mergeTransforms } from "./utils";
import { TRANSITION, TRANSITION_DURATION_MS } from "./LampMotionRoot";

const IDENTITY_TRANSFORM = "translate3d(0px, 0px, 0px) scale(1, 1)";
const TRANSFORM_PROPERTY = "transform";

type AnimationState = "idle" | "opening" | "closing";

export interface LampMotionContentProps {
  children: ReactElement;
}

function buildTransform(values: { translateX: number; translateY: number; scaleX: number; scaleY: number }) {
  const { translateX, translateY, scaleX, scaleY } = values;
  return `translate3d(${translateX}px, ${translateY}px, 0px) scale(${scaleX}, ${scaleY})`;
}

export function LampMotionContent({ children }: LampMotionContentProps) {
  const {
    isOpen,
    shouldRenderPortal,
    originRect,
    measureOriginRect,
    beginAnimation,
    endAnimation,
    commitClose,
  } = useLampMotionContext("Content");

  const contentRef = useRef<HTMLElement | null>(null);
  const animationStateRef = useRef<AnimationState>("idle");
  const rafHandlesRef = useRef<number[]>([]);
  const baseTransformRef = useRef<string>("");
  const latestOriginRectRef = useRef(originRect);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    latestOriginRectRef.current = originRect;
  }, [originRect]);

  const flushRafs = useCallback(() => {
    rafHandlesRef.current.forEach((id) => cancelAnimationFrame(id));
    rafHandlesRef.current = [];
  }, []);

  const restoreRestingStyles = useCallback((node: HTMLElement) => {
    node.style.transition = "";
    node.style.willChange = "";
    node.style.pointerEvents = "";
    const base = baseTransformRef.current || "";
    if (base) {
      node.style.transform = base;
    } else {
      node.style.transform = IDENTITY_TRANSFORM;
    }
  }, []);

  const pushRaf = useCallback((id: number) => {
    rafHandlesRef.current.push(id);
  }, []);

  const clearCloseFallback = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const startCloseFallback = useCallback(
    (node: HTMLElement) => {
      clearCloseFallback();
      if (typeof window === "undefined") {
        return;
      }
      closeTimeoutRef.current = window.setTimeout(() => {
        if (animationStateRef.current !== "closing") return;
        animationStateRef.current = "idle";
        restoreRestingStyles(node);
        commitClose();
      }, TRANSITION_DURATION_MS + 32);
    },
    [clearCloseFallback, commitClose, restoreRestingStyles],
  );

  const playOpen = useCallback(
    (node: HTMLElement) => {
      flushRafs();
      const origin = latestOriginRectRef.current ?? measureOriginRect();
      if (!origin) {
        restoreRestingStyles(node);
        endAnimation();
        animationStateRef.current = "idle";
        return;
      }

      const targetRect = node.getBoundingClientRect();
      const transform = buildTransform(calculateTransform(origin, targetRect));
      const base = baseTransformRef.current;
      const finalTransform = base ? base : IDENTITY_TRANSFORM;
      const initialTransform = mergeTransforms(base, transform);

      if (initialTransform === finalTransform) {
        restoreRestingStyles(node);
        endAnimation();
        animationStateRef.current = "idle";
        return;
      }

      animationStateRef.current = "opening";
      beginAnimation();
      node.style.willChange = TRANSFORM_PROPERTY;
      node.style.pointerEvents = "none";
      node.style.transition = "none";
      node.style.transformOrigin = "top left";
      node.style.transform = initialTransform;

      const first = requestAnimationFrame(() => {
        const second = requestAnimationFrame(() => {
          node.style.transition = TRANSITION;
          node.style.transform = finalTransform;
        });
        pushRaf(second);
      });
      pushRaf(first);
    },
    [beginAnimation, endAnimation, flushRafs, measureOriginRect, pushRaf, restoreRestingStyles],
  );

  const playClose = useCallback(
    (node: HTMLElement) => {
      flushRafs();
      const origin = measureOriginRect();
      if (!origin) {
        animationStateRef.current = "idle";
        restoreRestingStyles(node);
        commitClose();
        return;
      }

      const targetRect = node.getBoundingClientRect();
      const transform = buildTransform(calculateTransform(origin, targetRect));
      const base = baseTransformRef.current;
      const startTransform = base ? base : IDENTITY_TRANSFORM;
      const finalTransform = mergeTransforms(base, transform);

      if (finalTransform === startTransform) {
        animationStateRef.current = "idle";
        restoreRestingStyles(node);
        commitClose();
        return;
      }

      animationStateRef.current = "closing";
      beginAnimation();
      node.style.willChange = TRANSFORM_PROPERTY;
      node.style.pointerEvents = "none";
      node.style.transition = TRANSITION;
      node.style.transformOrigin = "top left";
      node.style.transform = startTransform;

      startCloseFallback(node);

      const id = requestAnimationFrame(() => {
        node.style.transform = finalTransform;
      });
      pushRaf(id);
    },
    [
      beginAnimation,
      commitClose,
      flushRafs,
      measureOriginRect,
      pushRaf,
      restoreRestingStyles,
      startCloseFallback,
    ],
  );

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== node) return;
      if (event.propertyName !== TRANSFORM_PROPERTY) return;

      if (animationStateRef.current === "opening") {
        animationStateRef.current = "idle";
        restoreRestingStyles(node);
        endAnimation();
      } else if (animationStateRef.current === "closing") {
        animationStateRef.current = "idle";
        restoreRestingStyles(node);
        clearCloseFallback();
        commitClose();
      }
    };

    node.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      clearCloseFallback();
      node.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [clearCloseFallback, commitClose, endAnimation, restoreRestingStyles]);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const inline = node.style.transform;
    let computed = "";
    if (typeof window !== "undefined") {
      const value = window.getComputedStyle(node).transform;
      if (value && value !== "none") {
        computed = value;
      }
    }
    baseTransformRef.current = inline || computed || "";

    if (isOpen) {
      playOpen(node);
      return;
    }

    if (shouldRenderPortal) {
      playClose(node);
    }

    return () => {
      flushRafs();
      clearCloseFallback();
    };
  }, [clearCloseFallback, flushRafs, isOpen, playClose, playOpen, shouldRenderPortal]);

  useEffect(
    () => () => {
      flushRafs();
      clearCloseFallback();
    },
    [clearCloseFallback, flushRafs],
  );

  if (!isValidElement(children)) {
    throw new Error("<LampMotion.Content> expects a single React element child.");
  }

  return cloneElement(children, {
    ref: mergeRefs(children.ref, contentRef),
  });
}
