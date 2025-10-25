/**
 * GenieMotion Library - Core Animation Hook
 * Manages the genie animation lifecycle using requestAnimationFrame
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { calculateGenieTransform } from "./animations";
import type { UseGenieMotionOptions, AnimationPhase } from "./types";

// Constants
const ANIMATION_DURATION_MS = 600;

/**
 * Core hook that manages the genie animation
 * Uses requestAnimationFrame for smooth 60fps animation
 */
export function useGenieMotion(options: UseGenieMotionOptions) {
  const { isOpen, triggerRef, contentRef, onAnimationComplete } = options;
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const animationFrameIdRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const animate = useCallback(
    (startTime: number, triggerRect: DOMRect, contentRect: DOMRect, animating: boolean) => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

      // For opening: progress 0->1, for closing: progress 1->0
      const effectiveProgress = animating ? progress : 1 - progress;

      const transform = calculateGenieTransform(effectiveProgress, triggerRect, contentRect);

      if (contentRef.current) {
        contentRef.current.style.transform = transform;
        contentRef.current.style.opacity = String(effectiveProgress);
      }

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(() =>
          animate(startTime, triggerRect, contentRect, animating)
        );
      } else {
        // Animation complete - set final state
        if (contentRef.current) {
          if (animating) {
            // Opening complete - reset to centered position
            contentRef.current.style.transform = "translate(-50%, -50%)";
            contentRef.current.style.opacity = "1";
          }
        }
        isAnimatingRef.current = false;
        setAnimationPhase("complete");
        onAnimationComplete?.();
      }
    },
    [contentRef, onAnimationComplete]
  );

  useEffect(() => {
    // Prevent multiple animations at the same time
    if (isAnimatingRef.current) return;
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();

    // Cancel any existing animation
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    isAnimatingRef.current = true;
    setAnimationPhase("animating");

    const startTime = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(() =>
      animate(startTime, triggerRect, contentRect, isOpen)
    );

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [isOpen, triggerRef, contentRef, animate]);

  return { animationPhase };
}
