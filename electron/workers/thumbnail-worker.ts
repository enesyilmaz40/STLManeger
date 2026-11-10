import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

// Setup IPC listener inside worker
const ipc = (window as any).electronThumbnailAPI;

const canvas = document.getElementById('thumb-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(384, 384);
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0); // transparent background

const scene = new THREE.Scene();

// Studio lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(1.5, 2, 2.5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.75);
fillLight.position.set(-2, -1, -1.5);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.55);
rimLight.position.set(0, 3, -2);
scene.add(rimLight);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);

const loader = new STLLoader();

if (ipc && ipc.onRenderRequest) {
  ipc.onRenderRequest(async (data: { id: number; buffer: any }) => {
    try {
      // Robust ArrayBuffer normalization (handles ArrayBuffer, Buffer, Uint8Array)
      let arrayBuffer: ArrayBuffer;
      if (data.buffer instanceof ArrayBuffer) {
        arrayBuffer = data.buffer;
      } else if (data.buffer && data.buffer.buffer instanceof ArrayBuffer) {
        arrayBuffer = data.buffer.buffer.slice(
          data.buffer.byteOffset,
          data.buffer.byteOffset + data.buffer.byteLength
        );
      } else if (ArrayBuffer.isView(data.buffer)) {
        arrayBuffer = (data.buffer as any).buffer;
      } else if (typeof data.buffer === 'object') {
        const values = Object.values(data.buffer) as number[];
        arrayBuffer = new Uint8Array(values).buffer;
      } else {
        throw new Error('Geçersiz STL veri formatı');
      }

      const geometry = loader.parse(arrayBuffer);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      const box = geometry.boundingBox!;
      const size = new THREE.Vector3();
      box.getSize(size);

      // Center geometry around origin for camera framing
      geometry.center();

      const dims = {
        x: Math.round(size.x * 100) / 100,
        y: Math.round(size.y * 100) / 100,
        z: Math.round(size.z * 100) / 100,
      };

      const triangles = geometry.index
        ? geometry.index.count / 3
        : geometry.attributes.position.count / 3;
      const vertices = geometry.attributes.position.count;

      const material = new THREE.MeshStandardMaterial({
        color: 0x3b82f6, // Modern vibrant blue
        roughness: 0.35,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Position camera based on max dimension
      const maxDim = Math.max(size.x, size.y, size.z) || 10;
      const cameraDistance = maxDim * 1.85;

      camera.position.set(cameraDistance * 0.7, cameraDistance * 0.75, cameraDistance);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      // Render offscreen WebGL frame
      renderer.render(scene, camera);

      const dataUrl = canvas.toDataURL('image/png');

      // Resource cleanup
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      renderer.renderLists.dispose();

      ipc.sendRenderSuccess({
        id: data.id,
        dataUrl,
        dims,
        triangles: Math.round(triangles),
        vertices,
      });
    } catch (err: any) {
      console.error('Thumbnail generation error in worker:', err);
      ipc.sendRenderError({
        id: data.id,
        error: err.message || String(err),
      });
    }
  });
} else {
  console.error('electronThumbnailAPI is not available in worker!');
}
