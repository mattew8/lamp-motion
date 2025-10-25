/**
 * GenieMotion Library - Trigger Component
 * Button that opens the genie animation
 */

import React from "react";
import { useGenieMotionContext } from "./GenieMotionRoot";
import type { GenieMotionTriggerProps } from "./types";

/**
 * Trigger component (button) that initiates the genie animation
 * Supports 'asChild' pattern similar to Radix UI
 */
export function GenieMotionTrigger({
  asChild = false,
  children,
  onClick,
  ...props
}: GenieMotionTriggerProps) {
  const { triggerRef, open, isOpen } = useGenieMotionContext();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      open();
    }
    onClick?.(event);
  };

  // asChild pattern: allows using custom element instead of button
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ref: triggerRef,
      onClick: handleClick,
      ...props,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      ref={triggerRef as React.RefObject<HTMLButtonElement>}
      onClick={handleClick}
      aria-expanded={isOpen}
      {...props}
    >
      {children}
    </button>
  );
}
