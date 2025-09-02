import { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";

function Model({ position }) {
  const { scene } = useGLTF("/figure.glb"); // cargamos desde public
  return <primitive object={scene} position={position} scale={0.3} />;
}

export default function Cam() {
  const videoRef = useRef(null);
  const [palmPos, setPalmPos] = useState(null);

  useEffect(() => {
    if (!videoRef.current) return;

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
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const palm = landmarks[9];
        setPalmPos({
          x: (palm.x - 0.5) * 4,
          y: -(palm.y - 0.5) * 3,
          z: palm.z * 2,
        });
      } else {
        setPalmPos(null);
      }
    });

    let camera = new Camera(videoRef.current, {
      onFrame: async () => await hands.send({ image: videoRef.current }),
      width: 640,
      height: 480,
    });
    camera.start();

    return () => camera.stop();
  }, []);

  return (
    <div style={{ position: "relative", width: 640, height: 480 }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        width="640"
        height="480"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />

      <Canvas
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
        camera={{ position: [0, 0, 5] }}
      >
        <ambientLight intensity={1} />
        <OrbitControls />
        {palmPos && <Model position={[palmPos.x, palmPos.y, palmPos.z]} />}
      </Canvas>
    </div>
  );
}
