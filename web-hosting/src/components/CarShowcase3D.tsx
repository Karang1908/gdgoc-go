import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

interface CarShowcase3DProps {
  carId: string;
  fallbackImage: string;
}

const CAR_MODEL_PATHS: Record<string, string> = {
  sports: '/models/cars/sports.fbx',
  race: '/models/cars/race.fbx',
  suv: '/models/cars/suv.fbx',
  taxi: '/models/cars/taxi.fbx',
};

// Global cache for loaded textures and cloned models to make switching instantaneous
const textureLoader = new THREE.TextureLoader();
const fbxLoader = new FBXLoader();
let colormapTexture: THREE.Texture | null = null;
const modelCache: Record<string, THREE.Group> = {};

export const CarShowcase3D: React.FC<CarShowcase3DProps> = ({ carId, fallbackImage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 340;

    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    // Elevated front-right 3/4 perspective
    camera.position.set(-3.2, 2.3, 4.4);
    camera.lookAt(0, 0.2, 0);

    // 2. WebGL Renderer with Anti-Aliasing & Alpha Transparency
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Strict non-interactive security: no canvas clicks/drags/context menus
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.userSelect = 'none';

    container.appendChild(renderer.domElement);

    // 3. Studio Lighting (Rich saturated colors, soft highlights, zero burnout)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    keyLight.position.set(4, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.9);
    fillLight.position.set(-5, 4, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, -3, 5);
    scene.add(rimLight);

    // 4. Model Root Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    let animationFrameId: number;
    let isMounted = true;

    // Load Colormap Texture Once
    if (!colormapTexture) {
      colormapTexture = textureLoader.load('/models/cars/colormap.png');
      colormapTexture.colorSpace = THREE.SRGBColorSpace;
    }

    const applyMaterials = (object: THREE.Object3D) => {
      object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = new THREE.MeshStandardMaterial({
            map: colormapTexture,
            roughness: 0.45,
            metalness: 0.15,
          });
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
    };

    const loadCarModel = (id: string) => {
      const modelPath = CAR_MODEL_PATHS[id] || CAR_MODEL_PATHS.sports;

      const setupLoadedModel = (fbx: THREE.Group) => {
        if (!isMounted) return;

        // Clear existing model children
        while (modelGroup.children.length > 0) {
          modelGroup.remove(modelGroup.children[0]);
        }

        const clone = fbx.clone(true);
        applyMaterials(clone);

        // Center model geometry perfectly around origin (0,0,0)
        const box = new THREE.Box3().setFromObject(clone);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Scale uniformly to fill the showcase stage elegantly
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.4 / (maxDim || 1);
        clone.scale.setScalar(scale);

        clone.position.x = -center.x * scale;
        clone.position.y = -box.min.y * scale - 0.2; // Sit firmly on stage
        clone.position.z = -center.z * scale;

        modelGroup.add(clone);
      };

      if (modelCache[id]) {
        setupLoadedModel(modelCache[id]);
      } else {
        fbxLoader.load(
          modelPath,
          (fbx) => {
            modelCache[id] = fbx;
            setupLoadedModel(fbx);
          },
          undefined,
          (err) => {
            console.warn('[CarShowcase3D] Error loading 3D model:', err);
            if (isMounted) setHasError(true);
          }
        );
      }
    };

    loadCarModel(carId);

    // 5. Continuous, butter-smooth 60fps/120fps Real-Time Render Loop (Slow elegant rotation)
    let lastTime = performance.now();
    const rotateSpeed = 0.55; // Radians per second (~11.5 seconds per full 360° turn)

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      modelGroup.rotation.y += delta * rotateSpeed;

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 6. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [carId]);

  if (hasError) {
    return (
      <img
        src={fallbackImage}
        alt="Vehicle preview"
        className="showcase-car-img fallback"
        draggable={false}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="car-3d-stage"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0 18px 32px rgba(0, 0, 0, 0.45))',
      }}
    />
  );
};
