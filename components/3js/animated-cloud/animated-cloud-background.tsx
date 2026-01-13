"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Cloud, Environment } from "@react-three/drei"
import { useRef, memo } from "react"
import type * as THREE from "three"
import { useCloudPhysics } from "./use-cloud-physics"

// --- BACKGROUND CONFIGURATION ---
const CONFIG = {
    // Visuals
    CLOUD_ZOOM: 1.6,           // Scale of the clouds (fullscreen effect)
    CAMERA_Z: 6,               // Distance from clouds
    CAMERA_FOV: 85,            // Field of view

    // Master Toggles
    SCROLL_PHYSICS_ENABLED: false,
    WINDOW_PHYSICS_ENABLED: true,
    SPRING_BACK_ENABLED: false, // Set to true to return to center altitude after movement

    // Physics Fine-tuning
    SCROLL_GUST_STRENGTH: 0.05,
    WINDOW_INERTIA_STRENGTH: 0.08,
    SPRING_BACK_STRENGTH: 0.94, // How quickly they return (0.9 to 0.99)
    FRICTION_STRENGTH: 0.995,   // Drift decay when spring back is disabled
}

const AnimatedCloud = memo(({
    position,
    scale,
    speed,
    scrollDisturbanceRef,
    windowDisturbanceRef,
    velocityRef,
    windowVelocityRef,
}: {
    position: [number, number, number]
    scale: number
    speed: number
    scrollDisturbanceRef: React.RefObject<number>
    windowDisturbanceRef: React.RefObject<number>
    velocityRef: React.RefObject<number>
    windowVelocityRef: React.RefObject<{ x: number, y: number }>
}) => {
    const cloudRef = useRef<THREE.Group>(null)
    const initialPos = useRef({ x: position[0], y: position[1] })
    const drift = useRef({ x: 0, y: 0 })

    useFrame((state) => {
        if (cloudRef.current) {
            // Calculate active disturbance based on toggles
            const sDist = CONFIG.SCROLL_PHYSICS_ENABLED ? (scrollDisturbanceRef.current || 0) : 0
            const wDist = CONFIG.WINDOW_PHYSICS_ENABLED ? (windowDisturbanceRef.current || 0) : 0
            const disturbance = sDist + wDist

            const scrollVelocity = (velocityRef.current || 0) * (CONFIG.SCROLL_PHYSICS_ENABLED ? 1 : 0)
            const windowVelocity = CONFIG.WINDOW_PHYSICS_ENABLED
                ? (windowVelocityRef.current || { x: 0, y: 0 })
                : { x: 0, y: 0 }

            // Base floating animation
            const floatY = Math.sin(state.clock.elapsedTime * 0.3 * speed) * 0.3
            const floatX = Math.cos(state.clock.elapsedTime * 0.2 * speed) * 0.2

            // Turbulence based on active disturbance
            const turbulenceY = Math.sin(state.clock.elapsedTime * 1.5) * disturbance * 0.6
            const turbulenceX = Math.cos(state.clock.elapsedTime * 1.8) * disturbance * 0.6

            // Combined forces
            const gustForceY = scrollVelocity * CONFIG.SCROLL_GUST_STRENGTH * (1 / scale)
            const windowForceX = windowVelocity.x * CONFIG.WINDOW_INERTIA_STRENGTH * (1 / scale)
            const windowForceY = windowVelocity.y * CONFIG.WINDOW_INERTIA_STRENGTH * (1 / scale)

            drift.current.y -= (gustForceY + windowForceY)
            drift.current.x -= windowForceX

            // Decay / Return logic
            if (CONFIG.SPRING_BACK_ENABLED) {
                drift.current.y *= CONFIG.SPRING_BACK_STRENGTH
                drift.current.x *= CONFIG.SPRING_BACK_STRENGTH
            } else {
                drift.current.y *= CONFIG.FRICTION_STRENGTH
                drift.current.x *= CONFIG.FRICTION_STRENGTH
            }

            cloudRef.current.position.x = initialPos.current.x + floatX + turbulenceX + drift.current.x
            cloudRef.current.position.y = initialPos.current.y + floatY + turbulenceY + drift.current.y
            cloudRef.current.position.z = position[2]

            // Rotation
            cloudRef.current.rotation.y += 0.001 * speed * (1 + disturbance)
            cloudRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2 * speed) * 0.1 +
                (scrollVelocity * 0.02) + (windowVelocity.x * 0.01)

            // Scale
            const pulseScale = 1 + Math.sin(state.clock.elapsedTime * 0.5 * speed) * 0.05
            cloudRef.current.scale.setScalar(scale * pulseScale * (1 + disturbance * 0.05))
        }
    })

    return (
        <group ref={cloudRef}>
            <Cloud opacity={0.65} speed={0.2} segments={20} color="#b8b8b8" />
        </group>
    )
})

AnimatedCloud.displayName = "AnimatedCloud"

export function AnimatedCloudBackground() {
    const {
        velocityRef,
        scrollDisturbanceRef,
        windowDisturbanceRef,
        progressRef,
        windowVelocityRef
    } = useCloudPhysics()

    return (
        <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-[#1e1e1e]">
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        backgroundImage: `
              radial-gradient(circle at 20% 50%, #2d2d2d 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, #262626 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, #232323 0%, transparent 50%),
              linear-gradient(135deg, #1e1e1e 0%, #252525 25%, #2a2a2a 50%, #252525 75%, #1e1e1e 100%)
            `,
                    }}
                />
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "repeat",
                    }}
                />
            </div>

            <div className="absolute inset-0 opacity-80">
                <Canvas camera={{ position: [0, 0, CONFIG.CAMERA_Z], fov: CONFIG.CAMERA_FOV }}>
                    <ambientLight intensity={0.7} />
                    <pointLight position={[10, 10, 10]} intensity={0.5} color="#f0f0f0" />
                    <Environment preset="night" />

                    <AnimatedCloud
                        position={[-3, 1, 0]}
                        scale={1.2 * CONFIG.CLOUD_ZOOM}
                        speed={0.8}
                        scrollDisturbanceRef={scrollDisturbanceRef}
                        windowDisturbanceRef={windowDisturbanceRef}
                        velocityRef={velocityRef}
                        windowVelocityRef={windowVelocityRef}
                    />
                    <AnimatedCloud
                        position={[3, -1, -2]}
                        scale={1.0 * CONFIG.CLOUD_ZOOM}
                        speed={1.2}
                        scrollDisturbanceRef={scrollDisturbanceRef}
                        windowDisturbanceRef={windowDisturbanceRef}
                        velocityRef={velocityRef}
                        windowVelocityRef={windowVelocityRef}
                    />
                    <AnimatedCloud
                        position={[0, 2, -4]}
                        scale={1.5 * CONFIG.CLOUD_ZOOM}
                        speed={0.6}
                        scrollDisturbanceRef={scrollDisturbanceRef}
                        windowDisturbanceRef={windowDisturbanceRef}
                        velocityRef={velocityRef}
                        windowVelocityRef={windowVelocityRef}
                    />
                    <AnimatedCloud
                        position={[-4, -2, -1]}
                        scale={0.9 * CONFIG.CLOUD_ZOOM}
                        speed={1.0}
                        scrollDisturbanceRef={scrollDisturbanceRef}
                        windowDisturbanceRef={windowDisturbanceRef}
                        velocityRef={velocityRef}
                        windowVelocityRef={windowVelocityRef}
                    />
                    <AnimatedCloud
                        position={[4, 0, -3]}
                        scale={1.1 * CONFIG.CLOUD_ZOOM}
                        speed={0.9}
                        scrollDisturbanceRef={scrollDisturbanceRef}
                        windowDisturbanceRef={windowDisturbanceRef}
                        velocityRef={velocityRef}
                        windowVelocityRef={windowVelocityRef}
                    />
                    <AnimatedCloud
                        position={[1, -3, -5]}
                        scale={1.3 * CONFIG.CLOUD_ZOOM}
                        speed={0.7}
                        scrollDisturbanceRef={scrollDisturbanceRef}
                        windowDisturbanceRef={windowDisturbanceRef}
                        velocityRef={velocityRef}
                        windowVelocityRef={windowVelocityRef}
                    />
                </Canvas>
            </div>

            <div className="absolute inset-0 animate-[pulse_12s_ease-in-out_infinite]">
                <div className="h-full w-full bg-gradient-to-t from-[#1e1e1e]/60 via-transparent to-[#242424]/30" />
            </div>
        </div>
    )
}
