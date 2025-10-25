/**
 * GenieMotion Library - Root Component
 * Provides context for all child components
 */

import React, { createContext, useContext, useState, useRef } from "react";
import type { GenieMotionContextValue, GenieMotionRootProps } from "./types";

const GenieMotionContext = createContext<GenieMotionContextValue | null>(null);

/**
 * Hook to access GenieMotion context
 * @throws Error if used outside of GenieMotion.Root
 */
export function useGenieMotionContext(): GenieMotionContextValue {
  const context = useContext(GenieMotionContext);
  if (!context) {
    throw new Error(
      "GenieMotion components must be used within GenieMotion.Root. " +
        "Wrap your components with <GenieMotion.Root>."
    );
  }
  return context;
}

/**
 * Root component that manages state and provides context
 */
export function GenieMotionRoot({
  children,
  defaultOpen = false,
  onOpenChange,
}: GenieMotionRootProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  const open = () => {
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const close = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const value: GenieMotionContextValue = {
    isOpen,
    triggerRef,
    contentRef,
    open,
    close,
  };

  return <GenieMotionContext.Provider value={value}>{children}</GenieMotionContext.Provider>;
}
