import React from 'react';
import { motion } from 'framer-motion';
import { AnimationToolcall, type AnimationConfig } from '../ui/AnimationToolcall';

export const searchDiscoveryConfig: AnimationConfig = {
  primaryColor: 'border-purple-500/60',
  secondaryColor: 'bg-purple-500/30',
  ringSpeed: 2,
  ringType: 'dashed'
};

interface AnimationSearchDiscoveryProps {
  isProcessing: boolean;
}

/**
 * Animation for Search & Discovery tools:
 * fileSearch, grepSearch, listDirectory
 * Behavior: Chaotic swarm of orbiting particles
 */
export const AnimationSearchDiscovery: React.FC<AnimationSearchDiscoveryProps> = ({ isProcessing }) => {
  const defaultParticles = (
    <>
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={`float-${i}`}
          className="absolute w-1 h-1 bg-slate-400/30 rounded-full"
          animate={{
            y: [0, -6, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8
          }}
          style={{ 
            left: 35 + (i * 15),
            top: 35 + (i * 15)
          }}
        />
      ))}
    </>
  );

  const orbitParticles = (
    <>
      {/* Chaotic Swarm */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`swarm-${i}`}
          className="absolute w-1.5 h-1.5 bg-purple-500/60 rounded-full"
          animate={{
            rotate: [0, 360],
            scale: [0.6, 1.2, 0.6],
            x: [0, Math.cos(i * 45) * 35, 0],
            y: [0, Math.sin(i * 45) * 35, 0]
          }}
          transition={{
            duration: 1.5 + Math.random(),
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </>
  );

  return (
    <AnimationToolcall config={searchDiscoveryConfig} isProcessing={isProcessing}>
      {isProcessing ? orbitParticles : defaultParticles}
    </AnimationToolcall>
  );
};
