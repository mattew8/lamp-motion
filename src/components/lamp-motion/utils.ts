import type { CSSProperties, MutableRefObject, Ref, SyntheticEvent } from "react";

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;

      if (typeof ref === "function") {
        ref(node);
        return;
      }

      (ref as MutableRefObject<T | null>).current = node;
    });
  };
}

export function composeEventHandlers<E extends SyntheticEvent>(
  theirs: ((event: E) => void) | undefined,
  ours: (event: E) => void,
) {
  return (event: E) => {
    theirs?.(event);
    if (event.defaultPrevented) return;
    ours(event);
  };
}

interface Measurement {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TransformValues {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
}

export function calculateTransform(origin: Measurement, target: Measurement): TransformValues {
  const translateX = origin.left - target.left;
  const translateY = origin.top - target.top;

  return {
    translateX,
    translateY,
    scaleX: safeScale(origin.width, target.width),
    scaleY: safeScale(origin.height, target.height),
  };
}

function safeScale(originSize: number, targetSize: number): number {
  if (targetSize === 0) return 1;
  if (originSize === 0) return 0.0001;
  return originSize / targetSize;
}

export function mergeTransforms(
  base: CSSProperties["transform"],
  applied: string,
): CSSProperties["transform"] {
  if (!base) return applied;
  return `${base} ${applied}`.trim();
}
