import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export default function Cam() {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    // 🔹 THREE.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(640, 480);
    renderer.setClearColor(0x000000, 0); // fondo transparente
    containerRef.current.appendChild(renderer.domElement);

    // 🔹 Luz
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(light);

    // 🔹 Video como textura
    const videoTexture = new THREE.VideoTexture(videoRef.current);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    const videoGeometry = new THREE.PlaneGeometry(4, 3);
    const videoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
    const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
    videoMesh.position.z = -2; // detrás del modelo
    scene.add(videoMesh);

    // 🔹 Modelo GLB
    let model = null;
    const loader = new GLTFLoader();
    loader.load("/figure.glb", (gltf) => {
      model = gltf.scene;
      model.visible = false;
      model.scale.set(0.3, 0.3, 0.3);
      scene.add(model);
    });

    camera.position.z = 2;

    // 🔹 MediaPipe Hands
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
      if (results.multiHandLandmarks && model) {
        const palm = results.multiHandLandmarks[0][9]; // landmark palma

        // Posición en Three.js
        const x = (palm.x - 0.5) * 4;
        const y = -(palm.y - 0.5) * 3;
        const z = -palm.z * 2;

        model.position.set(x, y, z);

        // Escalado dinámico
        const scale = THREE.MathUtils.clamp(
          0.3 / (Math.abs(palm.z) + 0.5),
          0.1,
          1
        );
        model.scale.set(scale, scale, scale);

        model.visible = true;
      } else if (model) {
        model.visible = false;
      }
    });

    // 🔹 Cámara
    let cam = null;
    try {
      cam = new Camera(videoRef.current, {
        onFrame: async () => await hands.send({ image: videoRef.current }),
        width: 640,
        height: 480,
      });
      cam.start();
    } catch (err) {
      setError("Error al iniciar la cámara");
      console.error(err);
    }

    // 🔹 Loop render
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (cam) cam.stop();
    };
  }, []);

  return (
    <div>
      <h1>AR: Mano con modelo 3D</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <div ref={containerRef} />
    </div>
  );
}
