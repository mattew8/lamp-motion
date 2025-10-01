import { createStripMesh } from "./mesh";
import { FRAGMENT_SHADER_SOURCE, VERTEX_SHADER_SOURCE } from "./shaders";
import type { GeniePlayOptions, Mesh, ShaderProgram } from "./types";

const isDevEnvironment =
  typeof process === "undefined" || (process.env?.NODE_ENV ?? "development") !== "production";

export function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl"));
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn("[LampMotion] WebGL not available", error);
    }
    return false;
  }
}

const GENIE_EASING_POINTS = { x1: 0.23, y1: 1, x2: 0.32, y2: 1 };

export function playGenie(canvas: HTMLCanvasElement, image: HTMLImageElement, opts: GeniePlayOptions): () => void {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    throw new Error("[LampMotion] WebGL context unavailable");
  }

  const program = createShaderProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
  gl.useProgram(program.program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const cols = Math.max(1, Math.floor(opts.cols));
  const rows = Math.max(1, Math.floor(opts.rows));
  const mesh = createStripMesh(gl, cols, rows);

  if (isDevEnvironment && typeof console !== "undefined") {
    const previewSrc = image.src ? image.src.slice(0, 80) : "";
    console.info("[LampMotion] texture source", {
      tag: image.tagName,
      width: image.width,
      height: image.height,
      naturalWidth: (image as HTMLImageElement).naturalWidth ?? image.width,
      naturalHeight: (image as HTMLImageElement).naturalHeight ?? image.height,
      src: previewSrc,
      crossOrigin: (image as HTMLImageElement).crossOrigin ?? null,
      complete: (image as HTMLImageElement).complete,
      decodeReady: typeof (image as HTMLImageElement).decode === "function",
    });
  }

  const texture = createTexture(gl, image);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
  enableAttribute(gl, program.attributes.position, 2);

  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.tbo);
  enableAttribute(gl, program.attributes.uv, 2);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);

  gl.uniform1i(program.uniforms.texture, 0);
  gl.uniform2f(program.uniforms.resolution, opts.size.w, opts.size.h);
  gl.uniform2f(program.uniforms.size, opts.size.w, opts.size.h);
  gl.uniform2f(program.uniforms.originLocal, opts.originLocal.x, opts.originLocal.y);
  gl.uniform2f(program.uniforms.direction, opts.directionVec.x, opts.directionVec.y);
  gl.uniform2f(program.uniforms.neck, opts.neck.min, opts.neck.max);
  gl.uniform1f(program.uniforms.curveStrength, opts.curveStrength);

  if (isDevEnvironment && typeof console !== "undefined") {
    console.info("[LampMotion] WebGL playGenie", {
      resolution: opts.size,
      origin: opts.originLocal,
      direction: opts.directionVec,
      neck: opts.neck,
      rows,
      cols,
      curveStrength: opts.curveStrength,
    });
  }

  let rafId = 0;
  let disposed = false;
  const start = performance.now();

  const ease = createBezierEasing(
    GENIE_EASING_POINTS.x1,
    GENIE_EASING_POINTS.y1,
    GENIE_EASING_POINTS.x2,
    GENIE_EASING_POINTS.y2,
  );

  const tick = (now: number) => {
    if (disposed) return;

    const elapsed = now - start;
    const timeline = Math.min(1, Math.max(0, elapsed / Math.max(opts.duration, 1)));
    const easedTimeline = ease(timeline);
    const progress = opts.direction === "open" ? easedTimeline : 1 - easedTimeline;

    gl.uniform1f(program.uniforms.progress, progress);

    if (isDevEnvironment && typeof console !== "undefined") {
      gl.finish();
      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        console.warn("[LampMotion] WebGL error", error);
      }
    }

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);

    if (timeline < 1) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    opts.onDone?.();
    dispose();
  };

  rafId = requestAnimationFrame(tick);

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    disableAttribute(gl, program.attributes.position);
    disableAttribute(gl, program.attributes.uv);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(texture);
    gl.deleteBuffer(mesh.vbo);
    gl.deleteBuffer(mesh.tbo);
    gl.deleteBuffer(mesh.ibo);
    gl.deleteProgram(program.program);
  }

  return dispose;
}

function enableAttribute(gl: WebGLRenderingContext, location: number, size: number) {
  if (location < 0) return;
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

function disableAttribute(gl: WebGLRenderingContext, location: number) {
  if (location < 0) return;
  gl.disableVertexAttribArray(location);
}

function createBezierEasing(x1: number, y1: number, x2: number, y2: number) {
  const NEWTON_ITERATIONS = 4;
  const NEWTON_MIN_SLOPE = 0.001;
  const SUBDIVISION_PRECISION = 0.0000001;
  const SUBDIVISION_MAX_ITERATIONS = 10;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number) {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t: number) {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleDerivativeX(t: number) {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number) {
    let t2 = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i += 1) {
      const x2 = sampleCurveX(t2) - x;
      const d2 = sampleDerivativeX(t2);
      if (Math.abs(d2) < NEWTON_MIN_SLOPE) break;
      t2 -= x2 / d2;
    }

    let t0 = 0;
    let t1 = 1;
    t2 = Math.max(0, Math.min(1, t2));

    for (
      let i = 0;
      i < SUBDIVISION_MAX_ITERATIONS && Math.abs(sampleCurveX(t2) - x) > SUBDIVISION_PRECISION;
      i += 1
    ) {
      if (sampleCurveX(t2) > x) {
        t1 = t2;
      } else {
        t0 = t2;
      }
      t2 = (t1 + t0) / 2;
    }

    return t2;
  }

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleCurveY(solveCurveX(x));
  };
}

function createShaderProgram(gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string): ShaderProgram {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);

  const program = gl.createProgram();
  if (!program) {
    throw new Error("[LampMotion] Failed to create WebGL program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(`[LampMotion] Failed to link program: ${info ?? "unknown"}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  const position = gl.getAttribLocation(program, "a_position");
  const uv = gl.getAttribLocation(program, "a_uv");

  return {
    program,
    attributes: {
      position,
      uv,
    },
    uniforms: {
      texture: gl.getUniformLocation(program, "u_texture"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      size: gl.getUniformLocation(program, "u_size"),
      originLocal: gl.getUniformLocation(program, "u_originLocal"),
      direction: gl.getUniformLocation(program, "u_direction"),
      progress: gl.getUniformLocation(program, "u_progress"),
      neck: gl.getUniformLocation(program, "u_neck"),
      curveStrength: gl.getUniformLocation(program, "u_curveStrength"),
    },
  };
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("[LampMotion] Failed to create shader");
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`[LampMotion] Shader compile error: ${info ?? "unknown"}`);
  }
  return shader;
}

function createTexture(gl: WebGLRenderingContext, image: HTMLImageElement): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("[LampMotion] Failed to create texture");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } catch (error) {
    if (isDevEnvironment && typeof console !== "undefined") {
      console.warn("[LampMotion] texImage2D failed", {
        error,
        src: image.src?.slice(0, 64),
        crossOrigin: (image as HTMLImageElement).crossOrigin ?? null,
      });
    }
    throw error;
  }

  return texture;
}
