import {
  cloneElement,
  isValidElement,
  useCallback,
  useRef,
  type ReactElement,
  type Ref,
  type SyntheticEvent,
} from "react";
import { useGenieMotionContext } from "./context";
import { composeEventHandlers, mergeRefs } from "./utils";

export interface GenieMotionTriggerProps {
  children: ReactElement;
}

export function GenieMotionTrigger({ children }: GenieMotionTriggerProps) {
  const { isOpen, open, close } = useGenieMotionContext("Trigger");
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
    throw new Error("<GenieMotion.Trigger> expects a single React element child.");
  }

  type ChildWithOptionalRef = ReactElement<Record<string, unknown>> & {
    ref?: Ref<HTMLElement>;
  };
  const child = children as ChildWithOptionalRef;
  const childProps = (child.props ?? {}) as Record<string, unknown>;

  return cloneElement(child, {
    ref: mergeRefs<HTMLElement>(child.ref as Ref<HTMLElement> | undefined, localRef),
    onClick: composeEventHandlers(
      childProps.onClick as ((event: SyntheticEvent<HTMLElement>) => void) | undefined,
      handleClick,
    ),
    "aria-expanded": isOpen,
  });
}
