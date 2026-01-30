import React from 'react';
import { motion } from 'framer-motion';
import { AnimationToolcall, type AnimationConfig } from '../ui/AnimationToolcall';

export const webAccessConfig: AnimationConfig = {
  primaryColor: 'border-cyan-500/60',
  secondaryColor: 'bg-cyan-500/30',
  ringSpeed: 12,
  ringType: 'dotted'
};

interface AnimationWebAccessProps {
  isProcessing: boolean;
}

/**
 * Animation for Web Access tools:
 * remote_web_search, webFetch
 * Behavior: Global neural network with mesh connections and orbiting nodes
 */
export const AnimationWebAccess: React.FC<AnimationWebAccessProps> = ({ isProcessing }) => {
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

  const networkParticles = (
    <>
      {/* Connection Web (SVG) */}
      <svg className="absolute w-full h-full pointer-events-none opacity-40">
        <defs>
          <radialGradient id="netGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        
        {/* Dynamic Mesh Lines */}
        {[...Array(6)].map((_, i) => (
          <motion.line
            key={`line-${i}`}
            x1="50%" y1="50%"
            x2="50%" y2="50%"
            stroke="url(#netGrad)"
            strokeWidth="1"
            animate={{
              x2: [50 + Math.cos(i) * 40, 50 + Math.cos(i+2) * 40, 50 + Math.cos(i) * 40],
              y2: [50 + Math.sin(i) * 40, 50 + Math.sin(i+2) * 40, 50 + Math.sin(i) * 40],
              opacity: [0.2, 0.6, 0.2]
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>

      {/* Orbiting Network Nodes */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`node-${i}`}
          className="absolute w-2 h-2 bg-cyan-100 border border-cyan-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          animate={{
            x: [
              Math.cos(i * 60 * (Math.PI / 180)) * 40,
              Math.cos((i * 60 + 120) * (Math.PI / 180)) * 30,
              Math.cos(i * 60 * (Math.PI / 180)) * 40
            ],
            y: [
              Math.sin(i * 60 * (Math.PI / 180)) * 30,
              Math.sin((i * 60 + 120) * (Math.PI / 180)) * 40,
              Math.sin(i * 60 * (Math.PI / 180)) * 30
            ],
            scale: [0.8, 1.2, 0.8],
            opacity: [0.6, 1, 0.6]
          }}
          transition={{
            duration: 3 + (i % 2),
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2
          }}
        >
          {/* Active Pulse Emitter */}
          <motion.div
            className="absolute inset-0 rounded-full bg-cyan-400"
            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>
      ))}

      {/* Core Data Uplinks */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`beam-${i}`}
          className="absolute w-[2px] bg-cyan-300/50 h-10 origin-bottom"
          initial={{ height: 0, opacity: 0, rotate: i * 120 }}
          animate={{ 
            height: [0, 45, 0], 
            opacity: [0, 0.8, 0],
            translateY: [0, -20, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "circOut"
          }}
        />
      ))}
    </>
  );

  return (
    <AnimationToolcall config={webAccessConfig} isProcessing={isProcessing}>
      {isProcessing ? networkParticles : defaultParticles}
    </AnimationToolcall>
  );
};
