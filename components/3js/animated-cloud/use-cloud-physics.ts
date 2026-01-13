"use client"

import { useEffect, useRef } from "react"

export function useCloudPhysics() {
    const lastScrollY = useRef(0)
    const lastWindowPos = useRef({ x: 0, y: 0 })
    const lastTime = useRef(Date.now())

    const velocityRef = useRef(0)
    const windowVelocityRef = useRef({ x: 0, y: 0 })
    const scrollDisturbanceRef = useRef(0)
    const windowDisturbanceRef = useRef(0)
    const progressRef = useRef(0)

    useEffect(() => {
        // Initialize
        lastWindowPos.current = { x: window.screenX, y: window.screenY }
        lastScrollY.current = window.scrollY

        const updateMetrics = () => {
            const now = Date.now()
            const deltaTime = Math.max(now - lastTime.current, 1)

            // Scroll metrics
            const currentScrollY = window.scrollY
            const deltaScroll = currentScrollY - lastScrollY.current

            // Window move metrics
            const currentWX = window.screenX
            const currentWY = window.screenY
            const deltaWX = currentWX - lastWindowPos.current.x
            const deltaWY = currentWY - lastWindowPos.current.y

            lastScrollY.current = currentScrollY
            lastWindowPos.current = { x: currentWX, y: currentWY }
            lastTime.current = now

            // Normalize scroll progress
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight
            progressRef.current = maxScroll > 0 ? currentScrollY / maxScroll : 0

            // Calculate velocities
            const rawScrollVel = deltaScroll / deltaTime
            velocityRef.current = Math.min(Math.max(velocityRef.current + rawScrollVel * 2, -15), 15)

            const winXVel = deltaWX / deltaTime
            const winYVel = deltaWY / deltaTime
            windowVelocityRef.current = {
                x: Math.min(Math.max(windowVelocityRef.current.x + winXVel * 2, -20), 20),
                y: Math.min(Math.max(windowVelocityRef.current.y + winYVel * 2, -20), 20)
            }

            // Update disturbances independently
            scrollDisturbanceRef.current = Math.min(scrollDisturbanceRef.current + Math.abs(rawScrollVel) * 0.1, 1.2)

            const winMovement = Math.abs(winXVel) + Math.abs(winYVel)
            windowDisturbanceRef.current = Math.min(windowDisturbanceRef.current + winMovement * 0.1, 1.2)
        }

        window.addEventListener("scroll", updateMetrics, { passive: true })
        const intervalId = setInterval(updateMetrics, 50)

        return () => {
            window.removeEventListener("scroll", updateMetrics)
            clearInterval(intervalId)
        }
    }, [])

    useEffect(() => {
        let animationFrameId: number

        const updatePhysics = () => {
            // Decay velocities
            velocityRef.current *= 0.85
            if (Math.abs(velocityRef.current) < 0.01) velocityRef.current = 0

            windowVelocityRef.current.x *= 0.85
            windowVelocityRef.current.y *= 0.85
            if (Math.abs(windowVelocityRef.current.x) < 0.01) windowVelocityRef.current.x = 0
            if (Math.abs(windowVelocityRef.current.y) < 0.01) windowVelocityRef.current.y = 0

            // Decay disturbances
            if (scrollDisturbanceRef.current > 0.001) {
                scrollDisturbanceRef.current *= 0.92
            } else {
                scrollDisturbanceRef.current = 0
            }

            if (windowDisturbanceRef.current > 0.001) {
                windowDisturbanceRef.current *= 0.92
            } else {
                windowDisturbanceRef.current = 0
            }

            animationFrameId = requestAnimationFrame(updatePhysics)
        }

        animationFrameId = requestAnimationFrame(updatePhysics)
        return () => cancelAnimationFrame(animationFrameId)
    }, [])

    return {
        progressRef,
        velocityRef,
        windowVelocityRef,
        scrollDisturbanceRef,
        windowDisturbanceRef
    }
}
