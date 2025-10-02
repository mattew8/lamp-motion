export interface GenieMotionOrigin {
  node: HTMLElement | null;
  rect: DOMRect | null;
  point?: { x: number; y: number };
}

export type GenieMotionOpenTarget =
  | HTMLElement
  | { x: number; y: number; width?: number; height?: number }
  | null;

export interface GenieMotionOptions {
  focusOnOpen?: boolean;
  lockScroll?: boolean;
}

export type GenieMotionResolvedOptions = Required<GenieMotionOptions>;
