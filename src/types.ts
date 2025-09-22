export interface LampMotionOrigin {
  node: HTMLElement | null;
  rect: DOMRect | null;
  point?: { x: number; y: number };
}

export type LampMotionOpenTarget =
  | HTMLElement
  | { x: number; y: number; width?: number; height?: number }
  | null;

export interface LampMotionOptions {
  focusOnOpen?: boolean;
  lockScroll?: boolean;
}

export type LampMotionResolvedOptions = Required<LampMotionOptions>;
