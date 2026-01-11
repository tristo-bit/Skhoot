// 3D Background component using Three.js
import { memo, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useSettings } from '../../src/contexts/SettingsContext';

// ============================================================================
// Types
// ============================================================================

export interface Background3DModel {
  id: string;
  name: string;
  path: string;
  scale?: number;
}

// ============================================================================
// Available Models
// ============================================================================

export const BUILT_IN_MODELS: Background3DModel[] = [
  { id: 'cube', name: 'Cube', path: '' },
  { id: 'sphere', name: 'Sphere', path: '' },
  { id: 'torus', name: 'Torus', path: '' },
  { id: 'icosahedron', name: 'Icosahedron', path: '' },
  { id: 'octahedron', name: 'Octahedron', path: '' },
  { id: 'dodecahedron', name: 'Dodecahedron', path: '' },
];

export const CUSTOM_MODEL_ID = 'custom';

// ============================================================================
// Custom ASCII Renderer (transparent background)
// ============================================================================

const ASCII_CHARS = ' .,:;i1tfLCG08@';

class TransparentAsciiRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private outputElement: HTMLPreElement;
  private charWidth: number = 6;
  private charHeight: number = 10;
  private color: string;

  constructor(container: HTMLDivElement, isDarkMode: boolean) {
    // Hidden canvas to read pixel data
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    
    // Output element for ASCII
    this.outputElement = document.createElement('pre');
    this.outputElement.style.cssText = `
      position: absolute;
      inset: 0;
      margin: 0;
      padding: 0;
      font-family: monospace;
      font-size: 8px;
      line-height: 1;
      letter-spacing: 0;
      white-space: pre;
      overflow: hidden;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    this.color = isDarkMode ? 'rgba(169, 131, 247, 0.7)' : 'rgba(99, 102, 241, 0.6)';
    this.outputElement.style.color = this.color;
    
    container.appendChild(this.outputElement);
  }

  setSize(width: number, height: number) {
    // Calculate grid size based on character dimensions
    const cols = Math.floor(width / this.charWidth);
    const rows = Math.floor(height / this.charHeight);
    this.canvas.width = cols;
    this.canvas.height = rows;
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const cols = this.canvas.width;
    const rows = this.canvas.height;
    
    if (cols <= 0 || rows <= 0) return;

    // Render scene to small canvas
    const prevSize = new THREE.Vector2();
    renderer.getSize(prevSize);
    
    renderer.setSize(cols, rows, false);
    renderer.render(scene, camera);
    
    // Read pixels
    this.ctx.drawImage(renderer.domElement, 0, 0, cols, rows);
    const imageData = this.ctx.getImageData(0, 0, cols, rows);
    const pixels = imageData.data;
    
    // Restore renderer size
    renderer.setSize(prevSize.x, prevSize.y, false);
    
    // Convert to ASCII
    let ascii = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        // If pixel is transparent (background), use space
        if (a < 10) {
          ascii += ' ';
        } else {
          // Calculate brightness
          const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const charIndex = Math.floor(brightness * (ASCII_CHARS.length - 1));
          ascii += ASCII_CHARS[charIndex];
        }
      }
      ascii += '\n';
    }
    
    this.outputElement.textContent = ascii;
  }

  dispose() {
    this.outputElement.remove();
  }
}

// ============================================================================
// Three.js Scene
// ============================================================================

interface SceneConfig {
  container: HTMLDivElement;
  modelId: string;
  customModelPath?: string;
  rotationDuration: number;
  opacity: number;
  isDarkMode: boolean;
  asciiMode: boolean;
}

class Background3DScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private asciiRenderer: TransparentAsciiRenderer | null = null;
  private model: THREE.Object3D | null = null;
  private animationId: number | null = null;
  private rotationDuration: number;
  private container: HTMLDivElement;
  private useAscii: boolean;
  private lastTime: number = 0;

  constructor(config: SceneConfig) {
    this.container = config.container;
    this.rotationDuration = config.rotationDuration;
    this.useAscii = config.asciiMode;

    this.scene = new THREE.Scene();

    const aspect = config.container.clientWidth / config.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.z = 4;

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: !config.asciiMode, 
      alpha: true,
      preserveDrawingBuffer: config.asciiMode,
    });
    this.renderer.setSize(config.container.clientWidth, config.container.clientHeight);
    this.renderer.setPixelRatio(config.asciiMode ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    if (config.asciiMode) {
      this.asciiRenderer = new TransparentAsciiRenderer(config.container, config.isDarkMode);
      this.asciiRenderer.setSize(config.container.clientWidth, config.container.clientHeight);
      // Keep WebGL canvas hidden but functional
      this.renderer.domElement.style.display = 'none';
      config.container.appendChild(this.renderer.domElement);
    } else {
      config.container.appendChild(this.renderer.domElement);
    }

    this.setupLighting(config.isDarkMode);
    this.loadModel(config.modelId, config.customModelPath, config.opacity, config.isDarkMode);

    this.lastTime = performance.now();
    this.animate();

    window.addEventListener('resize', this.handleResize);
  }

  private setupLighting(isDarkMode: boolean) {
    const ambient = new THREE.AmbientLight(0xffffff, isDarkMode ? 0.4 : 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, isDarkMode ? 0.8 : 1.0);
    directional.position.set(5, 5, 5);
    this.scene.add(directional);

    const accent = new THREE.PointLight(isDarkMode ? 0xa983f7 : 0x6366f1, 0.5, 10);
    accent.position.set(-3, 2, 3);
    this.scene.add(accent);
  }

  private createBuiltInGeometry(modelId: string): THREE.BufferGeometry {
    switch (modelId) {
      case 'sphere': return new THREE.SphereGeometry(1, 32, 32);
      case 'torus': return new THREE.TorusGeometry(0.8, 0.35, 16, 100);
      case 'icosahedron': return new THREE.IcosahedronGeometry(1, 0);
      case 'octahedron': return new THREE.OctahedronGeometry(1, 0);
      case 'dodecahedron': return new THREE.DodecahedronGeometry(1, 0);
      default: return new THREE.BoxGeometry(1.4, 1.4, 1.4);
    }
  }

  private loadModel(modelId: string, customPath: string | undefined, opacity: number, isDarkMode: boolean) {
    if (modelId === CUSTOM_MODEL_ID && customPath) {
      const loader = new GLTFLoader();
      loader.load(
        customPath,
        (gltf) => {
          this.model = gltf.scene;
          
          const box = new THREE.Box3().setFromObject(this.model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          this.model.scale.set(scale, scale, scale);
          
          const center = box.getCenter(new THREE.Vector3());
          this.model.position.sub(center.multiplyScalar(scale));

          this.model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
              child.material.transparent = true;
              child.material.opacity = opacity;
            }
          });

          this.scene.add(this.model);
        },
        undefined,
        () => this.loadBuiltIn('cube', opacity, isDarkMode)
      );
      return;
    }

    this.loadBuiltIn(modelId, opacity, isDarkMode);
  }

  private loadBuiltIn(modelId: string, opacity: number, isDarkMode: boolean) {
    const geometry = this.createBuiltInGeometry(modelId);
    const material = new THREE.MeshPhysicalMaterial({
      color: isDarkMode ? 0x8b5cf6 : 0x6366f1,
      metalness: 0.2,
      roughness: 0.5,
      transparent: true,
      opacity: opacity,
    });
    
    this.model = new THREE.Mesh(geometry, material);
    this.scene.add(this.model);
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    if (this.model && this.rotationDuration > 0) {
      const rotationPerMs = (Math.PI * 2) / this.rotationDuration;
      const rotation = rotationPerMs * delta;
      this.model.rotation.y += rotation;
      this.model.rotation.x += rotation * 0.3;
    }

    if (this.useAscii && this.asciiRenderer) {
      this.asciiRenderer.render(this.renderer, this.scene, this.camera);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private handleResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.asciiRenderer?.setSize(width, height);
  };

  updateRotationDuration(duration: number) {
    this.rotationDuration = duration;
  }

  updateOpacity(opacity: number) {
    this.model?.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
        child.material.opacity = opacity;
      }
    });
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize);
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.material instanceof THREE.Material) object.material.dispose();
      }
    });

    this.renderer.dispose();
    this.asciiRenderer?.dispose();
    this.renderer.domElement.remove();
  }
}

// ============================================================================
// Component
// ============================================================================

export const Background3D = memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Background3DScene | null>(null);
  const { background3D } = useSettings();

  const initScene = useCallback(() => {
    if (!containerRef.current || !background3D.enabled) return;

    sceneRef.current?.dispose();

    sceneRef.current = new Background3DScene({
      container: containerRef.current,
      modelId: background3D.modelId,
      customModelPath: background3D.customModelPath,
      rotationDuration: background3D.rotationDuration,
      opacity: background3D.opacity,
      isDarkMode: document.documentElement.classList.contains('dark'),
      asciiMode: background3D.asciiMode,
    });
  }, [background3D.enabled, background3D.modelId, background3D.customModelPath, background3D.asciiMode]);

  useEffect(() => {
    initScene();
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [initScene]);

  useEffect(() => {
    sceneRef.current?.updateRotationDuration(background3D.rotationDuration);
  }, [background3D.rotationDuration]);

  useEffect(() => {
    sceneRef.current?.updateOpacity(background3D.opacity);
  }, [background3D.opacity]);

  if (!background3D.enabled) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-[var(--app-radius)]"
      style={{ zIndex: 2 }}
    />
  );
});

Background3D.displayName = 'Background3D';
