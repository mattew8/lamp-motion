/**
 * GenieMotion Library - Content Component
 * Container that animates with the genie effect
 */

import React, { useEffect, useState } from "react";
import { useGenieMotionContext } from "./GenieMotionRoot";
import { useGenieMotion } from "./useGenieMotion";
import type { GenieMotionContentProps } from "./types";

/**
 * Content component that displays with genie animation
 * Automatically manages rendering based on animation state
 */
export function GenieMotionContent({
  children,
  className,
  style,
}: GenieMotionContentProps) {
  const { isOpen, contentRef, triggerRef, close } = useGenieMotionContext();
  const [shouldRender, setShouldRender] = useState(isOpen);

  // Animation hook manages the genie effect
  useGenieMotion({
    isOpen,
    triggerRef,
    contentRef,
    onAnimationComplete: () => {
      if (!isOpen) {
        setShouldRender(false);
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
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
          top: 0,
          left: 0,
          zIndex: 1000,
          transformOrigin: "center center",
          willChange: "transform, opacity",
          transform: "translateZ(0)", // Force GPU acceleration
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
