import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FC,
  type KeyboardEvent,
  type MouseEvent,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
  type JSXElementConstructor,
} from "react";
import { createPortal } from "react-dom";
import type { LampMotionOpenTarget, LampMotionOrigin, LampMotionResolvedOptions } from "./types";
import { focusFirst, getFocusableElements, restoreFocus } from "./utils/focus";
import { isBrowser } from "./utils/environment";

const DEFAULT_OPTIONS: LampMotionResolvedOptions = {
  focusOnOpen: true,
  lockScroll: true,
};

interface LampMotionContextValue {
  isOpen: boolean;
  open: (target?: LampMotionOpenTarget) => void;
  close: () => void;
  toggle: (target?: LampMotionOpenTarget) => void;
  triggerRef: MutableRefObject<HTMLElement | null>;
  contentRef: MutableRefObject<HTMLElement | null>;
  originRef: MutableRefObject<LampMotionOrigin | null>;
  options: LampMotionResolvedOptions;
  triggerId: string;
  contentId: string;
}

interface LampMotionProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  focusOnOpen?: boolean;
  lockScroll?: boolean;
}

interface LampMotionPortalProps {
  children: ReactNode;
  container?: HTMLElement | null;
}

interface BaseElementProps {
  id?: string;
  role?: string;
  tabIndex?: number;
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: string;
  "aria-modal"?: boolean;
  "aria-labelledby"?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  [key: string]: unknown;
}

type LampMotionElement = ReactElement<BaseElementProps, string | JSXElementConstructor<unknown>> & {
  ref?: Ref<HTMLElement>;
};

interface LampMotionTriggerProps {
  children: LampMotionElement;
}

interface LampMotionContentProps {
  children: LampMotionElement;
}

const LampMotionContext = createContext<LampMotionContextValue | null>(null);

function assertLampMotionElement(node: ReactNode): asserts node is LampMotionElement {
  if (!isValidElement<BaseElementProps>(node)) {
    throw new Error("LampMotion expects a single React element child.");
  }
}

function useLampMotionContext(component: string): LampMotionContextValue {
  const context = useContext(LampMotionContext);
  if (!context) {
    throw new Error(`<LampMotion.${component}> must be used within <LampMotion>`);
  }
  return context;
}

function createOrigin(target: LampMotionOpenTarget): LampMotionOrigin | null {
  if (!target || !isBrowser) return null;

  if (target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    const point = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    return { node: target, rect, point };
  }

  if (typeof target === "object" && "x" in target && "y" in target) {
    const width = target.width ?? 0;
    const height = target.height ?? 0;
    const rect = {
      x: target.x,
      y: target.y,
      width,
      height,
      top: target.y,
      left: target.x,
      right: target.x + width,
      bottom: target.y + height,
    } as DOMRect;
    const point = {
      x: target.x,
      y: target.y,
    };
    return { node: null, rect, point };
  }

  return null;
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): Ref<T> {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as MutableRefObject<T | null>).current = node;
      }
    });
  };
}

function composeEventHandlers<E extends SyntheticEvent>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void,
) {
  return (event: E) => {
    theirHandler?.(event);
    if (!event.defaultPrevented) {
      ourHandler(event);
    }
  };
}

const LampMotionRoot = ({
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  focusOnOpen,
  lockScroll,
}: LampMotionProps) => {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = isControlled ? (open ?? false) : uncontrolledOpen;

  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const originRef = useRef<LampMotionOrigin | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const openRef = useRef<boolean>(isOpen);
  const wasOpenRef = useRef<boolean>(isOpen);

  const triggerId = useId();
  const contentId = useId();

  const options = useMemo<LampMotionResolvedOptions>(
    () => ({
      focusOnOpen: focusOnOpen ?? DEFAULT_OPTIONS.focusOnOpen,
      lockScroll: lockScroll ?? DEFAULT_OPTIONS.lockScroll,
    }),
    [focusOnOpen, lockScroll],
  );

  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);

  const setOpenState = useCallback(
    (nextOpen: boolean, target?: LampMotionOpenTarget) => {
      openRef.current = nextOpen;

      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      if (nextOpen) {
        const resolvedTarget = target ?? triggerRef.current ?? null;
        originRef.current = createOrigin(resolvedTarget);

        if (resolvedTarget instanceof HTMLElement) {
          lastActiveRef.current = resolvedTarget;
        } else if (isBrowser) {
          lastActiveRef.current = document.activeElement as HTMLElement | null;
        }
      } else {
        originRef.current = null;
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const openMenu = useCallback(
    (target?: LampMotionOpenTarget) => {
      if (openRef.current) return;
      setOpenState(true, target);
    },
    [setOpenState],
  );

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    setOpenState(false);
  }, [setOpenState]);

  const toggleMenu = useCallback(
    (target?: LampMotionOpenTarget) => {
      setOpenState(!openRef.current, target);
    },
    [setOpenState],
  );

  useEffect(() => {
    if (!isBrowser || !options.lockScroll || !isOpen) return;

    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = "hidden";

    return () => {
      style.overflow = previousOverflow;
    };
  }, [isOpen, options.lockScroll]);

  useEffect(() => {
    if (!isBrowser || !isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const contentNode = contentRef.current;
      const triggerNode = triggerRef.current;

      if (contentNode?.contains(target)) return;
      if (triggerNode?.contains(target)) return;

      closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    openRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen && isBrowser) {
      restoreFocus(lastActiveRef.current ?? triggerRef.current);
      lastActiveRef.current = null;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const value = useMemo<LampMotionContextValue>(
    () => ({
      isOpen,
      open: openMenu,
      close: closeMenu,
      toggle: toggleMenu,
      triggerRef,
      contentRef,
      originRef,
      options,
      triggerId,
      contentId,
    }),
    [isOpen, openMenu, closeMenu, toggleMenu, options, triggerId, contentId],
  );

  return <LampMotionContext.Provider value={value}>{children}</LampMotionContext.Provider>;
};

const LampMotionTrigger = ({ children }: LampMotionTriggerProps) => {
  const context = useLampMotionContext("Trigger");
  const onlyChild = Children.only(children);
  assertLampMotionElement(onlyChild);
  const child = onlyChild;

  const ref = mergeRefs(child.ref, (node: HTMLElement | null) => {
    context.triggerRef.current = node;
  });

  const onClick = composeEventHandlers<MouseEvent<HTMLElement>>(child.props.onClick, (event) => {
    context.toggle(event.currentTarget as LampMotionOpenTarget);
  });

  const ariaControls = child.props["aria-controls"] ?? context.contentId;
  const id = child.props.id ?? context.triggerId;

  return cloneElement(child, {
    ref,
    id,
    onClick,
    "aria-haspopup": child.props["aria-haspopup"] ?? "dialog",
    "aria-expanded": context.isOpen,
    "aria-controls": ariaControls,
    "data-state": context.isOpen ? "open" : "closed",
  });
};

const LampMotionPortal = ({ children, container }: LampMotionPortalProps) => {
  const context = useLampMotionContext("Portal");
  if (!context.isOpen) return null;
  if (!isBrowser) return <>{children}</>;

  const target = container ?? document.body;
  return createPortal(children, target);
};

const LampMotionContent = ({ children }: LampMotionContentProps) => {
  const context = useLampMotionContext("Content");
  if (!context.isOpen) return null;

  const onlyChild = Children.only(children);
  assertLampMotionElement(onlyChild);
  const child = onlyChild;

  const ref = mergeRefs(child.ref, (node: HTMLElement | null) => {
    context.contentRef.current = node;
  });

  useEffect(() => {
    if (!context.isOpen || !context.options.focusOnOpen) return;
    focusFirst(context.contentRef.current);
  }, [context.isOpen, context.options.focusOnOpen]);

  const onKeyDown = composeEventHandlers<KeyboardEvent<HTMLElement>>(
    child.props.onKeyDown,
    (event) => {
      if (event.key === "Escape") {
        context.close();
        return;
      }

      if (event.key !== "Tab") return;

      const container = event.currentTarget as HTMLElement;
      const focusable = getFocusableElements(container);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
  );

  const id = child.props.id ?? context.contentId;

  return cloneElement(child, {
    ref,
    id,
    role: child.props.role ?? "dialog",
    "aria-modal": child.props["aria-modal"] ?? true,
    "aria-labelledby": child.props["aria-labelledby"] ?? context.triggerId,
    "data-state": context.isOpen ? "open" : "closed",
    tabIndex: child.props.tabIndex ?? -1,
    onKeyDown,
  });
};

type LampMotionComponent = FC<LampMotionProps> & {
  Trigger: typeof LampMotionTrigger;
  Portal: typeof LampMotionPortal;
  Content: typeof LampMotionContent;
};

const LampMotion = Object.assign(LampMotionRoot, {
  Trigger: LampMotionTrigger,
  Portal: LampMotionPortal,
  Content: LampMotionContent,
}) as LampMotionComponent;

export { LampMotion };
