import { cloneElement, isValidElement, useCallback, useRef, type ReactElement } from "react";
import { useLampMotionContext } from "./context";
import { composeEventHandlers, mergeRefs } from "./utils";

export interface LampMotionTriggerProps {
  children: ReactElement;
}

export function LampMotionTrigger({ children }: LampMotionTriggerProps) {
  const { isOpen, open, close } = useLampMotionContext("Trigger");
  const localRef = useRef<HTMLElement | null>(null);

  const handleClick = useCallback(() => {
    const element = localRef.current;
    if (!element) return;
    if (isOpen) {
      close();
      return;
    }
    open(element);
  }, [close, isOpen, open]);

  if (!isValidElement(children)) {
    throw new Error("<LampMotion.Trigger> expects a single React element child.");
  }

  return cloneElement(children, {
    ref: mergeRefs(children.ref, localRef),
    onClick: composeEventHandlers(children.props.onClick, handleClick),
    "aria-expanded": isOpen,
  });
}
