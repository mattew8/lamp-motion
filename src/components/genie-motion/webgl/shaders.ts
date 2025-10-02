export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_uv;

uniform vec2 u_resolution;
uniform vec2 u_size;
uniform vec2 u_originLocal;
uniform vec2 u_direction;
uniform float u_progress;
uniform vec2 u_neck;
uniform float u_curveStrength;

varying vec2 v_uv;

vec2 safeNormalize(vec2 value) {
  float len = length(value);
  if (len <= 0.0001) {
    return vec2(0.0, -1.0);
  }
  return value / len;
}

void main() {
  float progress = clamp(u_progress, 0.0, 1.0);
  float release = smoothstep(0.12, 0.95, progress);
  float collapse = 1.0 - release;

  vec2 dir = safeNormalize(u_direction);
  vec2 normal = vec2(-dir.y, dir.x);

  vec2 uv = clamp(a_position, 0.0, 1.0);
  vec2 basePos = vec2(uv.x * u_size.x, uv.y * u_size.y);
  vec2 fromOrigin = basePos - u_originLocal;

  float lonOrigin = dot(fromOrigin, dir);
  float latOrigin = dot(fromOrigin, normal);

  float anchor = smoothstep(0.0, 0.28, uv.y);
  float headHold = smoothstep(0.6, 1.0, uv.y);
  float neckCurve = pow(uv.y, 1.4);

  float baseWidth = max(u_size.x, 1.0);
  float neckMinPx = max(1.0, u_neck.x);
  float neckMaxPx = max(neckMinPx, u_neck.y);
  float headHoldWidth = mix(neckMinPx, baseWidth * 0.85, neckCurve);
  float collapsedWidth = min(neckMaxPx, headHoldWidth);
  float halfWidth = max(baseWidth * 0.5, 1.0);
  float latNorm = clamp(latOrigin / halfWidth, -1.0, 1.0);
  float collapsedHalf = max(collapsedWidth * 0.5, 1.0);
  float expandedHalf = halfWidth;
  float latCollapsed = latNorm * mix(collapsedHalf, expandedHalf * (0.6 + headHold * 0.25), headHold);
  float latExpanded = latNorm * expandedHalf;
  float latFinal = mix(latCollapsed, latExpanded, release);

  float lonPullScale = mix(0.12, 1.0, pow(anchor, 1.8));
  float lonCollapsed = lonOrigin * lonPullScale;
  float bendPull = u_curveStrength * collapse * pow(1.0 - uv.y, 1.85);
  lonCollapsed -= bendPull;
  float lonFinal = mix(lonCollapsed, lonOrigin, release);

  float lift = u_curveStrength * collapse * pow(1.0 - uv.y, 1.35);
  float liftMix = mix(0.24, 0.04, release);
  latFinal -= lift * liftMix;

  float lateralRatio = clamp(latNorm, -1.0, 1.0);
  latFinal += bendPull * 0.24 * lateralRatio * collapse;

  vec2 pos = u_originLocal + dir * lonFinal + normal * latFinal;

  vec2 normalized = vec2(
    pos.x / max(u_resolution.x, 1.0),
    pos.y / max(u_resolution.y, 1.0)
  );
  vec2 clip = vec2(normalized.x * 2.0 - 1.0, 1.0 - normalized.y * 2.0);

  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = vec2(clamp(a_uv.x, 0.0, 1.0), 1.0 - clamp(a_uv.y, 0.0, 1.0));
}
`;

export const FRAGMENT_SHADER_SOURCE = `
precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_texture;

void main() {
  vec4 color = texture2D(u_texture, v_uv);
  if (color.a <= 0.001) {
    discard;
  }
  gl_FragColor = color;
}
`;
