import * as THREE from 'three';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function detectHardwareWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (prefersReducedMotion()) return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return false;

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const rendererName = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|llvmpipe|softpipe|software/i.test(rendererName)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function createRadialGlowTexture(
  innerColor = 'rgba(223, 192, 130, 1)',
  midColor = 'rgba(201, 164, 92, 0.35)',
  outerColor = 'rgba(16, 16, 16, 0)'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.42, midColor);
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  return createRadialGlowTexture('rgba(0, 0, 0, 0.72)', 'rgba(0, 0, 0, 0.28)', 'rgba(0, 0, 0, 0)');
}

export function disposeThreeResources(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  extraTextures: THREE.Texture[] = []
): void {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
  extraTextures.forEach((t) => t.dispose());
  renderer.dispose();
}
