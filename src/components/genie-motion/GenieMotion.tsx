import { GenieMotionRoot } from "./GenieMotionRoot";
import { GenieMotionTrigger } from "./Trigger";
import { GenieMotionPortal } from "./Portal";
import { GenieMotionContent } from "./Content";

type GenieMotionCompound = typeof GenieMotionRoot & {
  Trigger: typeof GenieMotionTrigger;
  Portal: typeof GenieMotionPortal;
  Content: typeof GenieMotionContent;
};

export const GenieMotion = Object.assign(GenieMotionRoot, {
  Trigger: GenieMotionTrigger,
  Portal: GenieMotionPortal,
  Content: GenieMotionContent,
}) as GenieMotionCompound;

export type { GenieMotionTriggerProps } from "./Trigger";
export type { GenieMotionPortalProps } from "./Portal";
export type { GenieMotionContentProps } from "./Content";
