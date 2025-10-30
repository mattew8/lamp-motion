/**
 * GenieMotion Library - Animation Calculations
 * Pure functions for calculating Genie effect transformations
 */

// Constants
const MAX_SKEW_Y_ANGLE = 20;
const MAX_SKEW_X_ANGLE = 8;
const MAX_ROTATE_X_ANGLE = 12;
const WAVE_INTENSITY = 1.8;

/**
 * Cubic ease-in-out easing function
 * @param t - Progress value (0 to 1)
 * @returns Eased value (0 to 1)
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Exponential ease-out easing function (fast start, slow end)
 * Perfect for the "genie rushing out" effect
 * @param t - Progress value (0 to 1)
 * @returns Eased value (0 to 1)
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Back ease-out easing function (slight overshoot)
 * Adds a natural "pop" to the animation
 * @param t - Progress value (0 to 1)
 * @returns Eased value (0 to 1)
 */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Combined easing for genie effect (expo + back for natural feel)
 * Adjusted for snappier, more macOS-like feel
 * @param t - Progress value (0 to 1)
 * @returns Eased value (0 to 1)
 */
export function genieEasing(t: number): number {
  // Use exponential for most of the animation, with a hint of back easing
  const expo = easeOutExpo(t);
  const back = easeOutBack(t);
  // Blend: 80% expo + 20% back for snappier feel
  return expo * 0.8 + back * 0.2;
}

/**
 * Linear interpolation between two values
 * @param start - Start value
 * @param end - End value
 * @param progress - Progress value (0 to 1)
 * @returns Interpolated value
 */
export function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

/**
 * Calculate Genie effect transform string with enhanced 3D distortion
 * Improved to match macOS Genie effect more closely
 * @param progress - Animation progress (0 to 1)
 * @param from - Starting position (Trigger's getBoundingClientRect)
 * @param to - Ending position (Content's getBoundingClientRect)
 * @returns CSS transform string
 */
export function calculateGenieTransform(progress: number, from: DOMRect, to: DOMRect): string {
  // Apply genie-specific easing function
  const eased = genieEasing(progress);

  // Calculate target center position (where content should end up)
  const targetCenterX = to.left + to.width / 2;
  const targetCenterY = to.top + to.height / 2;

  // Calculate trigger center position (where animation starts)
  const triggerCenterX = from.left + from.width / 2;
  const triggerCenterY = from.top + from.height / 2;

  // Determine vertical direction (is trigger below or above content?)
  const isMovingUp = triggerCenterY > targetCenterY;
  const verticalDistance = Math.abs(triggerCenterY - targetCenterY);

  // Calculate translation with CURVED PATH (parabolic arc)
  const translateX = interpolate(triggerCenterX - targetCenterX, 0, eased);

  // Add parabolic curve to vertical movement (peaks at middle)
  const curveIntensity = Math.min(verticalDistance * 0.15, 80); // Max 80px curve
  const curveOffset = Math.sin(progress * Math.PI) * curveIntensity;
  const translateY = interpolate(triggerCenterY - targetCenterY, 0, eased) + curveOffset;

  // Calculate scale transformation
  const scaleX = interpolate(from.width / to.width, 1, eased);
  const scaleY = interpolate(from.height / to.height, 1, eased);

  // Enhanced wave distortion (stronger at start/end, peaks at middle)
  const waveProgress = Math.sin(progress * Math.PI);

  // Stronger distortion at the beginning and end (squeeze effect)
  const squeezeIntensity =
    progress < 0.5
      ? 1 - progress * 2 // 1 -> 0 (first half)
      : (progress - 0.5) * 2; // 0 -> 1 (second half)

  // DIRECTIONAL SKEW based on movement direction
  // If moving up: bottom squeezed, top wider (negative skew)
  // If moving down: top squeezed, bottom wider (positive skew)
  const directionMultiplier = isMovingUp ? -1 : 1;
  const baseSkewY = waveProgress * MAX_SKEW_Y_ANGLE * WAVE_INTENSITY;
  const squeezeSkewY = squeezeIntensity * MAX_SKEW_Y_ANGLE * 0.8;
  const skewY = (baseSkewY + squeezeSkewY) * directionMultiplier;

  // Horizontal skew (subtle side wobble)
  const secondaryWave = Math.sin(progress * Math.PI * 2);
  const skewX = secondaryWave * MAX_SKEW_X_ANGLE * WAVE_INTENSITY * 0.3;

  // 3D rotation for depth effect (matches skew direction)
  const rotateX = waveProgress * MAX_ROTATE_X_ANGLE * directionMultiplier * 0.5;

  // Perspective value (stronger at the middle of animation)
  const perspective = 1200 + waveProgress * 400;

  return `
    perspective(${perspective}px)
    translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px))
    scale(${scaleX}, ${scaleY})
    rotateX(${rotateX}deg)
    skewY(${skewY}deg)
    skewX(${skewX}deg)
  `
    .trim()
    .replace(/\s+/g, " ");
}
