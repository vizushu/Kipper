import { AmbientLight, Box3, DirectionalLight, Group, Mesh, OrthographicCamera, Scene, Vector3, WebGLRenderer } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** The Notion neutral concept is a real mesh, not a rig. Animate the whole body only. */
export function mountKipper(host: HTMLElement, animate: boolean, onReady: () => void, onFallback: () => void) {
  let renderer: WebGLRenderer;
  try { renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
  catch { onFallback(); return () => {}; }
  let frame = 0;
  let released = false;
  const scene = new Scene();
  const camera = new OrthographicCamera(-0.68, 0.68, 0.68, -0.68, 0.1, 10);
  camera.position.set(0, 0.02, 3);
  camera.lookAt(0, 0, 0);
  const character = new Group();
  scene.add(character, new AmbientLight(0xffffff, 2));
  const key = new DirectionalLight(0xfff7e9, 3);
  key.position.set(-2, 3, 4); scene.add(key);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(host.clientWidth || 192, host.clientHeight || 192);
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const draw = () => { if (!released) renderer.render(scene, camera); };
  const settle = () => { cancelAnimationFrame(frame); character.rotation.set(0, 0, 0); character.position.set(0, 0, 0); draw(); };
  const visibility = () => { if (document.hidden) settle(); };
  const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); onFallback(); release(); };
  const resize = new ResizeObserver(() => { renderer.setSize(host.clientWidth || 192, host.clientHeight || 192); draw(); });
  const release = () => {
    if (released) return;
    released = true; cancelAnimationFrame(frame); resize.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    renderer.domElement.removeEventListener("webglcontextlost", lost);
    scene.traverse(object => { if (object instanceof Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
    renderer.dispose(); renderer.domElement.remove();
  };
  void new GLTFLoader().loadAsync("/kipper/neutral-concept.glb").then(gltf => {
    if (released) {
      gltf.scene.traverse(object => { if (object instanceof Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
      return;
    }
    gltf.scene.traverse(object => { if (object instanceof Mesh && !object.geometry.getAttribute("normal")) object.geometry.computeVertexNormals(); });
    const center = new Box3().setFromObject(gltf.scene).getCenter(new Vector3());
    gltf.scene.position.sub(center); character.add(gltf.scene);
    resize.observe(host);
    document.addEventListener("visibilitychange", visibility);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    draw(); onReady();
    if (animate && !document.hidden) {
      const start = performance.now();
      const tick = (now: number) => {
        if (released || document.hidden) return settle();
        const progress = Math.min(1, (now - start) / 1670);
        const envelope = Math.sin(Math.PI * progress);
        character.rotation.z = Math.sin(progress * Math.PI * 2) * 0.07 * envelope;
        character.rotation.y = Math.sin(progress * Math.PI) * 0.14;
        character.position.y = envelope * 0.025;
        draw();
        if (progress < 1) frame = requestAnimationFrame(tick); else settle();
      };
      frame = requestAnimationFrame(tick);
    }
  }).catch(() => { if (!released) { onFallback(); release(); } });
  return release;
}
