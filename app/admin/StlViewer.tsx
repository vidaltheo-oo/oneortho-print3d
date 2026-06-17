"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import styles from "./admin.module.css";

// Viewer 3D STL pour le back-office. Charge le binaire depuis une URL signee
// (Supabase Storage), centre et cadre la piece, rotation auto + controles souris.
export default function StlViewer({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0;
    let disposed = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f2e8);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(1, 1, 1);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;

    function resize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h || 1;
      camera.updateProjectionMatrix();
    }

    let mesh: THREE.Mesh | null = null;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        if (disposed) return;
        const geometry = new STLLoader().parse(buf);
        geometry.computeVertexNormals();
        geometry.center();
        const material = new THREE.MeshStandardMaterial({
          color: 0x004b32,
          metalness: 0.1,
          roughness: 0.6,
        });
        mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Cadrage automatique sur la bounding sphere.
        geometry.computeBoundingSphere();
        const r = geometry.boundingSphere?.radius ?? 50;
        const dist = r / Math.sin((camera.fov * Math.PI) / 360);
        camera.position.set(0, r * 0.4, dist * 1.2);
        camera.near = dist / 100;
        camera.far = dist * 10;
        camera.updateProjectionMatrix();
        controls.target.set(0, 0, 0);
        controls.update();
        setLoading(false);
      } catch {
        if (!disposed) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    resize();
    window.addEventListener("resize", resize);

    function animate() {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      controls.dispose();
      mesh?.geometry.dispose();
      if (mesh) (mesh.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [url]);

  return (
    <div className={styles.viewerOverlay} onClick={onClose}>
      <div className={styles.viewerBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.viewerHead}>
          <span className={styles.viewerTitle}>{title}</span>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className={styles.viewerCanvas} ref={mountRef}>
          {loading && !error && (
            <div className={styles.viewerMsg}>Chargement du modèle…</div>
          )}
          {error && (
            <div className={styles.viewerMsg}>
              Impossible de charger ce fichier STL.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
