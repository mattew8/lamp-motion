/**
 * GenieMotion Library - Animation Calculations
 * Pure functions for calculating Genie effect transformations
 */

// Constants
const MAX_SKEW_ANGLE = 15;

/**
 * Cubic ease-in-out easing function
 * @param t - Progress value (0 to 1)
 * @returns Eased value (0 to 1)
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Linear interpolation between two values
 * @param start - Start value
 * @param end - End value
 * @param progress - Progress value (0 to 1)
 * @returns Interpolated value
 */
export function interpolate(
  start: number,
  end: number,
  progress: number
): number {
  return start + (end - start) * progress;
}

/**
 * Calculate Genie effect transform string
 * @param progress - Animation progress (0 to 1)
 * @param from - Starting position (Trigger's getBoundingClientRect)
 * @param to - Ending position (Content's getBoundingClientRect)
 * @returns CSS transform string
 */
export function calculateGenieTransform(
  progress: number,
  from: DOMRect,
  to: DOMRect
): string {
  // Apply easing function
  const eased = easeInOutCubic(progress);

  // Calculate scale transformation
  const scaleX = interpolate(from.width / to.width, 1, eased);
  const scaleY = interpolate(from.height / to.height, 1, eased);

  // Calculate position transformation
  const translateX = interpolate(from.left - to.left, 0, eased);
  const translateY = interpolate(from.top - to.top, 0, eased);

  // Calculate non-linear distortion (characteristic of Genie effect)
  const skewY = Math.sin(progress * Math.PI) * MAX_SKEW_ANGLE;

  return `
    translate(${translateX}px, ${translateY}px)
    scale(${scaleX}, ${scaleY})
    skewY(${skewY}deg)
  `
    .trim()
    .replace(/\s+/g, " ");
}
