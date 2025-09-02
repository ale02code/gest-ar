import React, { useEffect, useRef } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as THREE from "three";

export default function Cam() {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const cubeRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    // ---- Configuración Three.js ----
    const scene = new THREE.Scene();
    const camera3D = new THREE.PerspectiveCamera(
      75,
      640 / 480,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(640, 480);
    containerRef.current.appendChild(renderer.domElement);

    // Cubo (figura 3D)
    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const material = new THREE.MeshNormalMaterial();
    const cube = new THREE.Mesh(geometry, material);
    cube.visible = false; // Oculto por defecto
    scene.add(cube);
    cubeRef.current = cube;

    camera3D.position.z = 1.5;

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera3D);
    };
    animate();

    // ---- Configuración Mediapipe ----
    const hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults((results) => {
      if (
        results.multiHandLandmarks &&
        results.multiHandLandmarks.length > 0
      ) {
        const landmarks = results.multiHandLandmarks[0];

        // Landmark 9 = centro de la palma
        const palm = landmarks[9];

        // Normalizamos coordenadas de la cámara a espacio 3D
        const x = (palm.x - 0.5) * 2; // de -1 a 1
        const y = -(palm.y - 0.5) * 2;
        const z = palm.z;

        cube.position.set(x, y, z);
        cube.visible = true;
      } else {
        cube.visible = false;
      }
    });

    // ---- Cámara ----
    let cameraMediapipe = null;
    try {
      cameraMediapipe = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      cameraMediapipe.start();
    } catch (err) {
      console.error("Error iniciando cámara:", err);
    }

    return () => {
      if (cameraMediapipe) cameraMediapipe.stop();
      renderer.dispose();
    };
  }, []);

  return (
    <div>
      <h1>Detección de mano con figura 3D</h1>
      <video ref={videoRef} className="hidden" />
      <div ref={containerRef} />
    </div>
  );
}
