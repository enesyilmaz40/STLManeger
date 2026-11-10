import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
  RotateCcw,
  Maximize2,
  Eye,
  Grid,
  Palette,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { ModelFile } from '../../types/electron';

interface MiddleViewerProps {
  model: ModelFile;
}

type BackgroundColor = '#090d16' | '#18181b' | '#000000' | '#334155';

export const MiddleViewer: React.FC<MiddleViewerProps> = ({ model }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [bgColor, setBgColor] = useState<BackgroundColor>('#090d16');
  const [showAxes, setShowAxes] = useState(true);

  // Geometry stats calculated in viewer
  const [dimensions, setDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
  const [triangleCount, setTriangleCount] = useState<number>(0);
  const [vertexCount, setVertexCount] = useState<number>(0);

  // References to three objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const modelRadiusRef = useRef<number>(100);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      5000
    );
    camera.position.set(100, 100, 150);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(100, 200, 150);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.6);
    dirLight2.position.set(-100, -100, -100);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0x60a5fa, 0.4);
    dirLight3.position.set(0, 150, -150);
    scene.add(dirLight3);

    // Helpers
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);
    axesRef.current = axesHelper;

    const gridHelper = new THREE.GridHelper(200, 20, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // 6. Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize handling
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Load model geometry whenever model changes
  useEffect(() => {
    let isCancelled = false;

    const loadSTL = async () => {
      if (!sceneRef.current) return;
      setLoading(true);
      setError(null);

      try {
        // Only STL is rendered interactively in 3D viewer in V1
        if (model.file_type !== 'stl') {
          setError(
            `${model.file_type.toUpperCase()} dosyaları için 3D geometri görüntüleme bu sürümde desteklenmemektedir. Yalnızca STL dosyaları 3D etkileşimli görüntülenir.`
          );
          setLoading(false);
          return;
        }

        // Fetch array buffer from main process via IPC
        const buffer = await window.api.readFileBuffer(model.path);
        if (isCancelled) return;

        const loader = new STLLoader();
        const geometry = loader.parse(buffer);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        const box = geometry.boundingBox!;
        const size = new THREE.Vector3();
        box.getSize(size);

        // Center geometry for display
        geometry.center();

        const maxDim = Math.max(size.x, size.y, size.z) || 50;
        modelRadiusRef.current = maxDim;

        // Calculate and set metrics
        setDimensions({
          x: Math.round(size.x * 100) / 100,
          y: Math.round(size.y * 100) / 100,
          z: Math.round(size.z * 100) / 100,
        });

        const tris = geometry.index
          ? geometry.index.count / 3
          : geometry.attributes.position.count / 3;
        setTriangleCount(Math.round(tris));
        setVertexCount(geometry.attributes.position.count);

        // Remove old mesh
        if (meshRef.current) {
          sceneRef.current.remove(meshRef.current);
          meshRef.current.geometry.dispose();
          if (Array.isArray(meshRef.current.material)) {
            meshRef.current.material.forEach((m) => m.dispose());
          } else {
            meshRef.current.material.dispose();
          }
        }

        // Create Mesh
        const material = new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          metalness: 0.2,
          roughness: 0.35,
          wireframe,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        sceneRef.current.add(mesh);
        meshRef.current = mesh;

        // Position camera to fit model
        fitToScreen(maxDim);

        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('3D Viewer load error:', err);
          setError(`Model yüklenirken hata oluştu: ${err.message || String(err)}`);
          setLoading(false);
        }
      }
    };

    loadSTL();

    return () => {
      isCancelled = true;
    };
  }, [model.id, model.path]);

  // Update wireframe
  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.wireframe = wireframe;
    }
  }, [wireframe]);

  // Update background color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(bgColor);
    }
  }, [bgColor]);

  // Update helpers
  useEffect(() => {
    if (axesRef.current) axesRef.current.visible = showAxes;
    if (gridRef.current) gridRef.current.visible = showAxes;
  }, [showAxes]);

  const fitToScreen = (customRadius?: number) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const r = customRadius || modelRadiusRef.current || 50;
    const dist = r * 2.2;

    camera.position.set(dist * 0.7, dist * 0.75, dist);
    camera.lookAt(0, 0, 0);
    camera.near = dist * 0.01;
    camera.far = dist * 10;
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();
  };

  const setPresetView = (view: 'perspective' | 'front' | 'top' | 'right' | 'left') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const dist = (modelRadiusRef.current || 50) * 2.2;

    switch (view) {
      case 'perspective':
        camera.position.set(dist * 0.7, dist * 0.75, dist);
        break;
      case 'front':
        camera.position.set(0, 0, dist * 1.5);
        break;
      case 'top':
        camera.position.set(0, dist * 1.5, 0);
        break;
      case 'right':
        camera.position.set(dist * 1.5, 0, 0);
        break;
      case 'left':
        camera.position.set(-dist * 1.5, 0, 0);
        break;
    }

    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.update();
  };

  return (
    <div className="flex-1 relative flex flex-col bg-[#070b14] overflow-hidden select-none">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-xs text-slate-300 font-semibold tracking-wide">3D Model Geometrisi Yükleniyor...</p>
        </div>
      )}

      {/* Error Overlay */}
      {error && !loading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-xs text-slate-300 max-w-md leading-relaxed">{error}</p>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2 z-10">
        {/* Preset Views */}
        <div className="flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl space-x-1 shadow-lg">
          <button
            onClick={() => setPresetView('perspective')}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="İzometrik / Perspektif Görünüm"
          >
            Perspektif
          </button>
          <button
            onClick={() => setPresetView('front')}
            className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Önden Görünüm"
          >
            Ön
          </button>
          <button
            onClick={() => setPresetView('top')}
            className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Üstten Görünüm"
          >
            Üst
          </button>
          <button
            onClick={() => setPresetView('right')}
            className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Sağdan Görünüm"
          >
            Sağ
          </button>
          <button
            onClick={() => setPresetView('left')}
            className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Soldan Görünüm"
          >
            Sol
          </button>
        </div>

        {/* View toggles */}
        <div className="flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl space-x-1 shadow-lg">
          <button
            onClick={() => fitToScreen()}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Modele Odaklan / Sığdır"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setPresetView('perspective')}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Kamerayı Sıfırla"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`p-1.5 rounded-lg transition ${
              wireframe ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Tel Kafes (Wireframe) Görünümü"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`p-1.5 rounded-lg transition ${
              showAxes ? 'text-blue-400' : 'text-slate-500 hover:text-white hover:bg-slate-800'
            }`}
            title="Kılavuz ve Eksenleri Göster/Gizle"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Background color selector */}
        <div className="flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1 rounded-xl space-x-1 shadow-lg">
          {(['#090d16', '#18181b', '#000000', '#334155'] as BackgroundColor[]).map((col) => (
            <button
              key={col}
              onClick={() => setBgColor(col)}
              className={`w-5 h-5 rounded-md border transition ${
                bgColor === col ? 'border-blue-400 scale-110 shadow-sm' : 'border-slate-700 hover:border-slate-500'
              }`}
              style={{ backgroundColor: col }}
              title={`Arka plan rengi: ${col}`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Floating Dimensions & Stats Pill */}
      {dimensions && (
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between pointer-events-none z-10">
          <div className="flex items-center space-x-3 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 px-4 py-2 rounded-xl pointer-events-auto shadow-xl text-xs font-mono text-slate-300">
            <div>
              <span className="text-slate-400">X:</span>{' '}
              <span className="text-blue-400 font-bold">{dimensions.x}</span> mm
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div>
              <span className="text-slate-400">Y:</span>{' '}
              <span className="text-emerald-400 font-bold">{dimensions.y}</span> mm
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div>
              <span className="text-slate-400">Z:</span>{' '}
              <span className="text-indigo-400 font-bold">{dimensions.z}</span> mm
            </div>
            <div className="w-px h-3 bg-slate-800" />
            <div className="text-[11px] text-slate-400 font-sans">
              ▲ {triangleCount.toLocaleString('tr-TR')} Üçgen • {vertexCount.toLocaleString('tr-TR')} Nokta
            </div>
          </div>

          {/* Unit Note */}
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg pointer-events-auto">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span>STL formatında birim bilgisi bulunmaz; ölçüler varsayılan olarak milimetre (mm) kabul edilmektedir.</span>
          </div>
        </div>
      )}
    </div>
  );
};

