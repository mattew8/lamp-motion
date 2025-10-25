/**
 * GenieMotion Library - Type Definitions
 */

export interface GenieMotionContextValue {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement>;
  contentRef: React.RefObject<HTMLElement>;
  open: () => void;
  close: () => void;
}

export interface GenieMotionRootProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface GenieMotionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export interface GenieMotionContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export interface UseGenieMotionOptions {
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement>;
  contentRef: React.RefObject<HTMLElement>;
  onAnimationComplete?: () => void;
}

export type AnimationPhase = "idle" | "animating" | "complete";
