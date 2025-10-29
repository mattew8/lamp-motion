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
 * @param t - Progress value (0 to 1)
 * @returns Eased value (0 to 1)
 */
export function genieEasing(t: number): number {
  // Use exponential for most of the animation, with a hint of back easing
  const expo = easeOutExpo(t);
  const back = easeOutBack(t);
  // Blend: 70% expo + 30% back for subtle overshoot
  return expo * 0.7 + back * 0.3;
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

  // Calculate translation needed
  const translateX = interpolate(triggerCenterX - targetCenterX, 0, eased);
  const translateY = interpolate(triggerCenterY - targetCenterY, 0, eased);

  // Calculate scale transformation
  const scaleX = interpolate(from.width / to.width, 1, eased);
  const scaleY = interpolate(from.height / to.height, 1, eased);

  // Calculate wave distortion (peaks at middle of animation)
  // Using multiple sine waves for more natural, flowing distortion
  const waveProgress = Math.sin(progress * Math.PI);
  const secondaryWave = Math.sin(progress * Math.PI * 2);

  // Vertical skew (main genie effect)
  const skewY = waveProgress * MAX_SKEW_Y_ANGLE * WAVE_INTENSITY;

  // Horizontal skew (adds side-to-side wobble)
  const skewX = secondaryWave * MAX_SKEW_X_ANGLE * WAVE_INTENSITY * 0.5;

  // 3D rotation for depth effect
  const rotateX = waveProgress * MAX_ROTATE_X_ANGLE;

  // Perspective value (stronger at the middle of animation)
  const perspective = 1000 + waveProgress * 500;

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
