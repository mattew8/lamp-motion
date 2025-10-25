/**
 * GenieMotion Library - Public API
 * Compound component pattern similar to Radix UI
 */

import { GenieMotionRoot } from './GenieMotionRoot';
import { GenieMotionTrigger } from './GenieMotionTrigger';
import { GenieMotionContent } from './GenieMotionContent';

// Default export: Compound component pattern
export const GenieMotion = {
  Root: GenieMotionRoot,
  Trigger: GenieMotionTrigger,
  Content: GenieMotionContent,
};

// Named exports for tree-shaking
export { GenieMotionRoot };
export { GenieMotionTrigger };
export { GenieMotionContent };
export { useGenieMotionContext } from './GenieMotionRoot';

// Type exports
export type {
  GenieMotionContextValue,
  GenieMotionRootProps,
  GenieMotionTriggerProps,
  GenieMotionContentProps,
  UseGenieMotionOptions,
  AnimationPhase,
} from './types';
