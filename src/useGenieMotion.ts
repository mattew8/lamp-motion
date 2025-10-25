/**
 * GenieMotion Library - Core Animation Hook
 * Manages the genie animation lifecycle using requestAnimationFrame
 */

import { useEffect, useState } from 'react';
import { calculateGenieTransform } from './animations';
import type { UseGenieMotionOptions, AnimationPhase } from './types';

// Constants
const ANIMATION_DURATION_MS = 600;

/**
 * Core hook that manages the genie animation
 * Uses requestAnimationFrame for smooth 60fps animation
 */
export function useGenieMotion(options: UseGenieMotionOptions) {
  const { isOpen, triggerRef, contentRef, onAnimationComplete } = options;
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');

  useEffect(() => {
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

      // Reverse progress for closing animation
      const effectiveProgress = isOpen ? progress : 1 - progress;

      const transform = calculateGenieTransform(
        effectiveProgress,
        triggerRect,
        contentRect
      );

      if (contentRef.current) {
        contentRef.current.style.transform = transform;
        contentRef.current.style.opacity = String(effectiveProgress);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setAnimationPhase('complete');
        onAnimationComplete?.();
      }
    };

    setAnimationPhase('animating');
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, triggerRef, contentRef, onAnimationComplete]);

  return { animationPhase };
}
