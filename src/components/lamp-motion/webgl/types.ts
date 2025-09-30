export type GenieDirection = "open" | "close";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Neck {
  min: number;
  max: number;
}

export interface GeniePlayOptions {
  duration: number;
  direction: GenieDirection;
  originLocal: Vec2;
  size: Size;
  directionVec: Vec2;
  neck: Neck;
  curveStrength: number;
  cols: number;
  rows: number;
  onDone?: () => void;
}

export interface Mesh {
  vbo: WebGLBuffer;
  tbo: WebGLBuffer;
  ibo: WebGLBuffer;
  indexCount: number;
}

export interface ShaderProgram {
  program: WebGLProgram;
  attributes: {
    position: number;
    uv: number;
  };
  uniforms: {
    texture: WebGLUniformLocation | null;
    resolution: WebGLUniformLocation | null;
    size: WebGLUniformLocation | null;
    originLocal: WebGLUniformLocation | null;
    direction: WebGLUniformLocation | null;
    progress: WebGLUniformLocation | null;
    neck: WebGLUniformLocation | null;
    curveStrength: WebGLUniformLocation | null;
  };
}
