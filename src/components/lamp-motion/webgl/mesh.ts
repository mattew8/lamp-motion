import type { Mesh } from "./types";

function ensureBuffer(gl: WebGLRenderingContext, buffer: WebGLBuffer | null, label: string): WebGLBuffer {
  if (buffer) return buffer;
  throw new Error(`[LampMotion] Failed to create ${label} buffer`);
}

export function createStripMesh(gl: WebGLRenderingContext, cols: number, rows: number): Mesh {
  const safeCols = Math.max(1, Math.floor(cols));
  const safeRows = Math.max(1, Math.floor(rows));
  const columnCount = safeCols + 1;
  const rowCount = safeRows + 1;

  const vertexCount = columnCount * rowCount;
  const positions = new Float32Array(vertexCount * 2);
  const uvs = new Float32Array(vertexCount * 2);

  let offset = 0;
  for (let row = 0; row < rowCount; row += 1) {
    const v = row / safeRows;
    for (let col = 0; col < columnCount; col += 1) {
      const u = col / safeCols;
      positions[offset] = u;
      uvs[offset] = u;
      offset += 1;
      positions[offset] = v;
      uvs[offset] = v;
      offset += 1;
    }
  }

  const quadCount = safeCols * safeRows;
  const indices = new Uint16Array(quadCount * 6);

  let indexOffset = 0;
  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      const topLeft = row * columnCount + col;
      const topRight = topLeft + 1;
      const bottomLeft = topLeft + columnCount;
      const bottomRight = bottomLeft + 1;

      indices[indexOffset + 0] = topLeft;
      indices[indexOffset + 1] = bottomLeft;
      indices[indexOffset + 2] = topRight;
      indices[indexOffset + 3] = topRight;
      indices[indexOffset + 4] = bottomLeft;
      indices[indexOffset + 5] = bottomRight;
      indexOffset += 6;
    }
  }

  const vbo = ensureBuffer(gl, gl.createBuffer(), "vertex");
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const tbo = ensureBuffer(gl, gl.createBuffer(), "uv");
  gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

  const ibo = ensureBuffer(gl, gl.createBuffer(), "index");
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return {
    vbo,
    tbo,
    ibo,
    indexCount: indices.length,
  };
}
