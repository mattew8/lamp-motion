import { LampMotionRoot } from "./LampMotionRoot";
import { LampMotionTrigger } from "./Trigger";
import { LampMotionPortal } from "./Portal";
import { LampMotionContent } from "./Content";

type LampMotionCompound = typeof LampMotionRoot & {
  Trigger: typeof LampMotionTrigger;
  Portal: typeof LampMotionPortal;
  Content: typeof LampMotionContent;
};

export const LampMotion = Object.assign(LampMotionRoot, {
  Trigger: LampMotionTrigger,
  Portal: LampMotionPortal,
  Content: LampMotionContent,
}) as LampMotionCompound;

export type { LampMotionTriggerProps } from "./Trigger";
export type { LampMotionPortalProps } from "./Portal";
export type { LampMotionContentProps } from "./Content";
