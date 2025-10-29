/**
 * GenieMotion Library - Content Component
 * Container that animates with the genie effect
 */

import React, { useEffect, useState, useCallback } from "react";
import { useGenieMotionContext } from "./GenieMotionRoot";
import { useGenieMotion } from "./useGenieMotion";
import type { GenieMotionContentProps } from "./types";

/**
 * Content component that displays with genie animation
 * Automatically manages rendering based on animation state
 */
export function GenieMotionContent({ children, className, style }: GenieMotionContentProps) {
  const { isOpen, contentRef, triggerRef, close } = useGenieMotionContext();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isReady, setIsReady] = useState(false);

  const handleAnimationComplete = useCallback(() => {
    if (!isOpen) {
      setShouldRender(false);
      setIsReady(false);
    }
  }, [isOpen]);

  // Animation hook manages the genie effect
  useGenieMotion({
    isOpen: isOpen && isReady,
    triggerRef,
    contentRef,
    onAnimationComplete: handleAnimationComplete,
  });

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Wait for next frame to ensure ref is set
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    }
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {/* Backdrop/Overlay */}
      {isOpen && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
          }}
          role="presentation"
        />
      )}

      {/* Animated Content */}
      <div
        ref={contentRef as React.RefObject<HTMLDivElement>}
        className={className}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0,
          zIndex: 1000,
          transformOrigin: "center center",
          transformStyle: "preserve-3d",
          willChange: "transform, opacity",
          backfaceVisibility: "hidden",
          ...style,
        }}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>
  );
}
