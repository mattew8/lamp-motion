import type { MutableRefObject, Ref, SyntheticEvent } from "react";

const EPSILON = 0.0001;
const KAPPA = 0.5522847498307936; // bezier constant for rounded corners

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

export interface GenieMetrics {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  originX: number;
  originY: number;
  originRadius: number;
  expandedRadius: number;
  angle: number;
  distance: number;
  contentRect: DOMRect;
}

export function calculateGenieMetrics(origin: DOMRect, content: DOMRect): GenieMetrics {
  const originCenterX = origin.left + origin.width / 2;
  const originCenterY = origin.top + origin.height / 2;
  const contentCenterX = content.left + content.width / 2;
  const contentCenterY = content.top + content.height / 2;

  const translateX = originCenterX - contentCenterX;
  const translateY = originCenterY - contentCenterY;

  const scaleX = safeDivide(origin.width, content.width);
  const scaleY = safeDivide(origin.height, content.height);

  const originX = originCenterX - content.left;
  const originY = originCenterY - content.top;

  const distance = Math.hypot(contentCenterX - originCenterX, contentCenterY - originCenterY);
  const angle =
    distance > EPSILON
      ? Math.atan2(contentCenterY - originCenterY, contentCenterX - originCenterX)
      : -Math.PI / 2;

  const originRadius = Math.max(origin.width, origin.height) / 2;
  const expandedRadius = Math.hypot(content.width, content.height);

  return {
    translateX,
    translateY,
    scaleX,
    scaleY,
    originX,
    originY,
    originRadius,
    expandedRadius,
    angle,
    distance,
    contentRect: new DOMRect(0, 0, content.width, content.height),
  };
}

export function buildGeniePath(metrics: GenieMetrics, t: number): string {
  const progress = clamp01(t);
  const neckHoldThreshold = 0.4;
  const neckHoldCap = 0.08;

  let neckProgress: number;
  if (progress <= neckHoldThreshold) {
    const heldT = clamp01(progress / neckHoldThreshold);
    neckProgress = clamp01(heldT * heldT * neckHoldCap);
  } else {
    const releaseT = clamp01((progress - neckHoldThreshold) / (1 - neckHoldThreshold));
    neckProgress = clamp01(lerp(neckHoldCap, 1, easeOutQuint(releaseT)));
  }

  const bodyProgress = easeOutQuint(progress);

  const { contentRect } = metrics;
  const width = Math.max(contentRect.width, 1);
  const height = Math.max(contentRect.height, 1);
  const maxRadius = Math.min(width, height) / 2;
  const minDimension = Math.min(width, height);
  const targetHeadRadius = Math.min(maxRadius, Math.max(minDimension * 0.35, 30));
  const radius = clamp(lerp(4, targetHeadRadius, bodyProgress), 1, maxRadius);

  const center = { x: width / 2, y: height / 2 };
  const origin = { x: metrics.originX, y: metrics.originY };

  const rawDirection = {
    x: origin.x - center.x,
    y: origin.y - center.y,
  };
  const dirToOrigin = metrics.distance < EPSILON ? { x: 0, y: -1 } : normalize(rawDirection);

  const perp =
    dirToOrigin.x === 0 && dirToOrigin.y === 0
      ? { x: 1, y: 0 }
      : { x: -dirToOrigin.y, y: dirToOrigin.x };
  const perpNormalized = normalize(perp);

  const halfWidth = width / 2;
  const halfHeight = height / 2;

  const scaleX =
    dirToOrigin.x === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dirToOrigin.x);
  const scaleY =
    dirToOrigin.y === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dirToOrigin.y);
  const boundaryScale = Math.min(scaleX, scaleY);
  const attachCenter = {
    x: center.x + dirToOrigin.x * boundaryScale,
    y: center.y + dirToOrigin.y * boundaryScale,
  };

  const side = determineSide(dirToOrigin, scaleX, scaleY);

  const spanLimitRaw = side === "top" || side === "bottom" ? width - radius * 2 : height - radius * 2;
  const spanLimit = Math.max(spanLimitRaw, 2);
  const neckMinBase = Math.max(2, targetHeadRadius / 14);
  const neckMin = Math.min(neckMinBase, spanLimit);
  const desiredNeckMax = Math.max(neckMin * 10, targetHeadRadius * 1.3);
  const neckMax = Math.max(neckMin, Math.min(spanLimit, desiredNeckMax));
  const neckWidth = clamp(lerp(neckMin, neckMax, neckProgress), neckMin, neckMax);
  const neckHalf = neckWidth / 2;

  const originWidth = clamp(
    lerp(neckMin * 0.6, neckWidth * 0.7, neckProgress),
    Math.max(1, neckMin * 0.5),
    Math.max(neckWidth, 2),
  );
  const originHalf = originWidth / 2;

  const rawOriginLeft = {
    x: origin.x - perpNormalized.x * originHalf,
    y: origin.y - perpNormalized.y * originHalf,
  };
  const rawOriginRight = {
    x: origin.x + perpNormalized.x * originHalf,
    y: origin.y + perpNormalized.y * originHalf,
  };

  const neckBlend = neckProgress;

  const neckAttachments = resolveNeckAttachments(
    side,
    attachCenter,
    neckHalf,
    radius,
    width,
    height,
  );
  const { neckAttachA, neckAttachB } = neckAttachments;

  const originLeft = lerpPoint(rawOriginLeft, neckAttachA, neckBlend * 0.5);
  const originRight = lerpPoint(rawOriginRight, neckAttachB, neckBlend * 0.5);

  const forwardScaleNear = clamp(0.08 + neckProgress * 0.6, 0.08, 0.85);
  const forwardScaleFar = clamp(0.18 + bodyProgress * 0.82, 0.18, 1);
  const lateralScale = clamp(0.12 + bodyProgress * 0.88, 0.12, 1);

  const leanStrength = clamp(metrics.distance / Math.max(width, height, 1), 0, 1);
  const leanAmount = radius * 0.35 * easeInOutCubic(bodyProgress) * leanStrength;
  const leanOffset = {
    x: -dirToOrigin.x * leanAmount,
    y: -dirToOrigin.y * leanAmount,
  };

  function morphPoint(point: { x: number; y: number }): { x: number; y: number } {
    const delta = { x: point.x - center.x, y: point.y - center.y };
    const forward = delta.x * dirToOrigin.x + delta.y * dirToOrigin.y;
    const lateral = delta.x * perpNormalized.x + delta.y * perpNormalized.y;

    const forwardScale = forward >= 0 ? forwardScaleNear : forwardScaleFar;
    const scaledForward = forward * forwardScale;
    const scaledLateral = lateral * lateralScale;

    const projected = {
      x: center.x + dirToOrigin.x * scaledForward + perpNormalized.x * scaledLateral,
      y: center.y + dirToOrigin.y * scaledForward + perpNormalized.y * scaledLateral,
    };

    return {
      x: projected.x + leanOffset.x,
      y: projected.y + leanOffset.y,
    };
  }

  const bodyAttachA = morphPoint(neckAttachA);
  const bodyAttachB = morphPoint(neckAttachB);
  const neckLeft = lerpPoint(originLeft, bodyAttachA, clamp(neckProgress * 1.15, 0.2, 0.95));
  const neckRight = lerpPoint(originRight, bodyAttachB, clamp(neckProgress * 1.15, 0.2, 0.95));

  const segments = buildBoundarySegments({
    side,
    neckAttachA,
    neckAttachB,
    radius,
    width,
    height,
  }).map((segment) => ({
    start: morphPoint(segment.start),
    cp1: morphPoint(segment.cp1),
    cp2: morphPoint(segment.cp2),
    end: morphPoint(segment.end),
  }));

  const pathParts: string[] = [];
  pathParts.push(`M ${fmt(originLeft.x)} ${fmt(originLeft.y)}`);
  appendCubic(pathParts, originLeft, neckLeft, neckLeft);
  appendCubic(pathParts, neckLeft, bodyAttachA, bodyAttachA);

  segments.forEach((segment) => appendSegment(pathParts, segment));

  appendCubic(pathParts, bodyAttachB, neckRight, neckRight);
  appendCubic(pathParts, neckRight, originRight, originRight);
  appendCubic(pathParts, originRight, originLeft, originLeft);
  pathParts.push("Z");

  return `path('${pathParts.join(" ")}')`;
}

export function supportsClipPathPath(): boolean {
  if (typeof window === "undefined") return false;
  const css = window.CSS;
  if (!css || typeof css.supports !== "function") {
    return false;
  }
  return css.supports("clip-path", "path('M0,0 L1,1')");
}

function determineSide(
  dirToOrigin: { x: number; y: number },
  scaleX: number,
  scaleY: number,
): "top" | "bottom" | "left" | "right" {
  if (scaleX < scaleY) {
    return dirToOrigin.x > 0 ? "right" : "left";
  }
  return dirToOrigin.y > 0 ? "bottom" : "top";
}

function resolveNeckAttachments(
  side: "top" | "bottom" | "left" | "right",
  attachCenter: { x: number; y: number },
  neckHalf: number,
  radius: number,
  width: number,
  height: number,
) {
  if (side === "top" || side === "bottom") {
    const y = side === "top" ? 0 : height;
    const clampedCenterX = clamp(attachCenter.x, radius + neckHalf, width - radius - neckHalf);
    const neckAttachA = { x: clamp(clampedCenterX - neckHalf, radius, width - radius), y };
    const neckAttachB = { x: clamp(clampedCenterX + neckHalf, radius, width - radius), y };
    return { neckAttachA, neckAttachB };
  }

  const x = side === "left" ? 0 : width;
  const clampedCenterY = clamp(attachCenter.y, radius + neckHalf, height - radius - neckHalf);
  const neckAttachA = { x, y: clamp(clampedCenterY - neckHalf, radius, height - radius) };
  const neckAttachB = { x, y: clamp(clampedCenterY + neckHalf, radius, height - radius) };
  return { neckAttachA, neckAttachB };
}

interface Segment {
  start: { x: number; y: number };
  cp1: { x: number; y: number };
  cp2: { x: number; y: number };
  end: { x: number; y: number };
}

function buildBoundarySegments(args: {
  side: "top" | "bottom" | "left" | "right";
  neckAttachA: { x: number; y: number };
  neckAttachB: { x: number; y: number };
  radius: number;
  width: number;
  height: number;
}): Segment[] {
  const { side, neckAttachA, neckAttachB, radius, width, height } = args;

  switch (side) {
    case "top":
      return buildTopSegments(neckAttachA, neckAttachB, radius, width, height);
    case "bottom":
      return buildBottomSegments(neckAttachA, neckAttachB, radius, width, height);
    case "left":
      return buildLeftSegments(neckAttachA, neckAttachB, radius, width, height);
    case "right":
      return buildRightSegments(neckAttachA, neckAttachB, radius, width, height);
    default:
      return buildTopSegments(neckAttachA, neckAttachB, radius, width, height);
  }
}

function buildTopSegments(
  neckAttachA: { x: number; y: number },
  neckAttachB: { x: number; y: number },
  radius: number,
  width: number,
  height: number,
): Segment[] {
  const topLeftEdge = { x: radius, y: 0 };
  const topRightEdge = { x: width - radius, y: 0 };
  const leftEdgeTop = { x: 0, y: radius };
  const leftEdgeBottom = { x: 0, y: height - radius };
  const bottomLeftEdge = { x: radius, y: height };
  const bottomRightEdge = { x: width - radius, y: height };
  const rightEdgeBottom = { x: width, y: height - radius };
  const rightEdgeTop = { x: width, y: radius };

  return [
    lineSegment(neckAttachA, topLeftEdge),
    cornerSegment(topLeftEdge, leftEdgeTop, "top-left", radius),
    lineSegment(leftEdgeTop, leftEdgeBottom),
    cornerSegment(leftEdgeBottom, bottomLeftEdge, "bottom-left", radius),
    lineSegment(bottomLeftEdge, bottomRightEdge),
    cornerSegment(bottomRightEdge, rightEdgeBottom, "bottom-right", radius),
    lineSegment(rightEdgeBottom, rightEdgeTop),
    cornerSegment(rightEdgeTop, topRightEdge, "top-right", radius),
    lineSegment(topRightEdge, neckAttachB),
  ];
}

function buildBottomSegments(
  neckAttachA: { x: number; y: number },
  neckAttachB: { x: number; y: number },
  radius: number,
  width: number,
  height: number,
): Segment[] {
  const bottomRightEdge = { x: width - radius, y: height };
  const bottomLeftEdge = { x: radius, y: height };
  const rightEdgeBottom = { x: width, y: height - radius };
  const rightEdgeTop = { x: width, y: radius };
  const topRightEdge = { x: width - radius, y: 0 };
  const topLeftEdge = { x: radius, y: 0 };
  const leftEdgeTop = { x: 0, y: radius };
  const leftEdgeBottom = { x: 0, y: height - radius };

  return [
    lineSegment(neckAttachA, bottomRightEdge),
    cornerSegment(bottomRightEdge, rightEdgeBottom, "bottom-right", radius),
    lineSegment(rightEdgeBottom, rightEdgeTop),
    cornerSegment(rightEdgeTop, topRightEdge, "top-right", radius),
    lineSegment(topRightEdge, topLeftEdge),
    cornerSegment(topLeftEdge, leftEdgeTop, "top-left", radius),
    lineSegment(leftEdgeTop, leftEdgeBottom),
    cornerSegment(leftEdgeBottom, bottomLeftEdge, "bottom-left", radius),
    lineSegment(bottomLeftEdge, neckAttachB),
  ];
}

function buildLeftSegments(
  neckAttachA: { x: number; y: number },
  neckAttachB: { x: number; y: number },
  radius: number,
  width: number,
  height: number,
): Segment[] {
  const leftEdgeBottom = { x: 0, y: height - radius };
  const leftEdgeTop = { x: 0, y: radius };
  const bottomLeftEdge = { x: radius, y: height };
  const bottomRightEdge = { x: width - radius, y: height };
  const rightEdgeBottom = { x: width, y: height - radius };
  const rightEdgeTop = { x: width, y: radius };
  const topRightEdge = { x: width - radius, y: 0 };
  const topLeftEdge = { x: radius, y: 0 };

  return [
    lineSegment(neckAttachA, leftEdgeBottom),
    cornerSegment(leftEdgeBottom, bottomLeftEdge, "bottom-left", radius),
    lineSegment(bottomLeftEdge, bottomRightEdge),
    cornerSegment(bottomRightEdge, rightEdgeBottom, "bottom-right", radius),
    lineSegment(rightEdgeBottom, rightEdgeTop),
    cornerSegment(rightEdgeTop, topRightEdge, "top-right", radius),
    lineSegment(topRightEdge, topLeftEdge),
    cornerSegment(topLeftEdge, leftEdgeTop, "top-left", radius),
    lineSegment(leftEdgeTop, neckAttachB),
  ];
}

function buildRightSegments(
  neckAttachA: { x: number; y: number },
  neckAttachB: { x: number; y: number },
  radius: number,
  width: number,
  height: number,
): Segment[] {
  const rightEdgeTop = { x: width, y: radius };
  const rightEdgeBottom = { x: width, y: height - radius };
  const topRightEdge = { x: width - radius, y: 0 };
  const topLeftEdge = { x: radius, y: 0 };
  const leftEdgeTop = { x: 0, y: radius };
  const leftEdgeBottom = { x: 0, y: height - radius };
  const bottomLeftEdge = { x: radius, y: height };
  const bottomRightEdge = { x: width - radius, y: height };

  return [
    lineSegment(neckAttachA, rightEdgeTop),
    cornerSegment(rightEdgeTop, topRightEdge, "top-right", radius),
    lineSegment(topRightEdge, topLeftEdge),
    cornerSegment(topLeftEdge, leftEdgeTop, "top-left", radius),
    lineSegment(leftEdgeTop, leftEdgeBottom),
    cornerSegment(leftEdgeBottom, bottomLeftEdge, "bottom-left", radius),
    lineSegment(bottomLeftEdge, bottomRightEdge),
    cornerSegment(bottomRightEdge, rightEdgeBottom, "bottom-right", radius),
    lineSegment(rightEdgeBottom, neckAttachB),
  ];
}

function cornerSegment(
  start: { x: number; y: number },
  end: { x: number; y: number },
  corner: "top-left" | "top-right" | "bottom-right" | "bottom-left",
  radius: number,
): Segment {
  if (radius <= 0) {
    return lineSegment(start, end);
  }

  switch (corner) {
    case "top-left":
      if (start.y <= end.y) {
        return {
          start,
          cp1: { x: start.x - radius * KAPPA, y: start.y },
          cp2: { x: end.x, y: end.y - radius * KAPPA },
          end,
        };
      }
      return {
        start,
        cp1: { x: start.x, y: start.y - radius * KAPPA },
        cp2: { x: end.x - radius * KAPPA, y: end.y },
        end,
      };
    case "top-right":
      if (start.y <= end.y) {
        return {
          start,
          cp1: { x: start.x + radius * KAPPA, y: start.y },
          cp2: { x: end.x, y: end.y - radius * KAPPA },
          end,
        };
      }
      return {
        start,
        cp1: { x: start.x, y: start.y - radius * KAPPA },
        cp2: { x: end.x + radius * KAPPA, y: end.y },
        end,
      };
    case "bottom-right":
      if (start.y >= end.y) {
        return {
          start,
          cp1: { x: start.x + radius * KAPPA, y: start.y },
          cp2: { x: end.x, y: end.y + radius * KAPPA },
          end,
        };
      }
      return {
        start,
        cp1: { x: start.x, y: start.y + radius * KAPPA },
        cp2: { x: end.x + radius * KAPPA, y: end.y },
        end,
      };
    case "bottom-left":
      if (start.x <= end.x) {
        return {
          start,
          cp1: { x: start.x, y: start.y + radius * KAPPA },
          cp2: { x: end.x - radius * KAPPA, y: end.y },
          end,
        };
      }
      return {
        start,
        cp1: { x: start.x - radius * KAPPA, y: start.y },
        cp2: { x: end.x, y: end.y + radius * KAPPA },
        end,
      };
    default:
      return lineSegment(start, end);
  }
}

function lineSegment(start: { x: number; y: number }, end: { x: number; y: number }): Segment {
  return { start, cp1: start, cp2: end, end };
}

function appendSegment(parts: string[], segment: Segment) {
  appendCubic(parts, segment.cp1, segment.cp2, segment.end);
}

function appendCubic(
  parts: string[],
  cp1: { x: number; y: number },
  cp2: { x: number; y: number },
  end: { x: number; y: number },
) {
  parts.push(
    `C ${fmt(cp1.x)} ${fmt(cp1.y)} ${fmt(cp2.x)} ${fmt(cp2.y)} ${fmt(end.x)} ${fmt(end.y)}`,
  );
}

function fmt(value: number): string {
  return Number.isFinite(value) ? Number(value.toFixed(3)).toString() : "0";
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerpPoint(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function normalize(vector: { x: number; y: number }): { x: number; y: number } {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude < EPSILON) {
    return { x: 0, y: 0 };
  }
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

function easeOutQuint(value: number): number {
  const inverted = 1 - value;
  return 1 - inverted ** 5;
}

function easeInOutCubic(value: number): number {
  if (value < 0.5) {
    return 4 * value * value * value;
  }
  const inverted = 2 * value - 2;
  return 0.5 * inverted * inverted * inverted + 1;
}

function safeDivide(value: number, divisor: number): number {
  if (Math.abs(divisor) < EPSILON) {
    return 1;
  }
  if (Math.abs(value) < EPSILON) {
    return EPSILON;
  }
  return value / divisor;
}
