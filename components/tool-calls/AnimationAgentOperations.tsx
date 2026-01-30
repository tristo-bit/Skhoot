import React from 'react';
import { motion } from 'framer-motion';
import { AnimationToolcall, type AnimationConfig } from '../ui/AnimationToolcall';

export const agentOperationsConfig: AnimationConfig = {
  primaryColor: 'border-indigo-500/60',
  secondaryColor: 'bg-indigo-500/30',
  ringSpeed: 8,
  ringType: 'solid'
};

interface AnimationAgentOperationsProps {
  isProcessing: boolean;
}

/**
 * Animation for Agent Operations tools:
 * invoke_agent, list_agents, create_agent
 * Behavior: Recursive fractals with branching nodes
 */
export const AnimationAgentOperations: React.FC<AnimationAgentOperationsProps> = ({ isProcessing }) => {
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

  const fractalParticles = (
    <>
      {/* Central Hub */}
      <motion.div
        className="absolute w-4 h-4 border-2 border-indigo-500/70 rounded-full"
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Branching Nodes */}
      {[...Array(6)].map((_, i) => {
        const angle = (i * 60) * (Math.PI / 180);
        const distance = 30;
        return (
          <React.Fragment key={`branch-${i}`}>
            {/* Connection Line */}
            <motion.div
              className="absolute w-[2px] bg-indigo-400/40 origin-center"
              style={{
                height: distance,
                left: '50%',
                top: '50%',
                transformOrigin: 'top center'
              }}
              animate={{
                rotate: [i * 60, i * 60 + 360],
                scaleY: [0.8, 1, 0.8]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2
              }}
            />
            
            {/* Node */}
            <motion.div
              className="absolute w-2 h-2 bg-indigo-300 border border-indigo-500 rounded-full"
              animate={{
                x: [
                  Math.cos(angle) * distance,
                  Math.cos(angle + Math.PI / 3) * (distance * 1.2),
                  Math.cos(angle) * distance
                ],
                y: [
                  Math.sin(angle) * distance,
                  Math.sin(angle + Math.PI / 3) * (distance * 1.2),
                  Math.sin(angle) * distance
                ],
                scale: [0.8, 1.2, 0.8],
                opacity: [0.6, 1, 0.6]
              }}
              transition={{
                duration: 3 + (i % 2),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.3
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Data Flow Particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`flow-${i}`}
          className="absolute w-1 h-1 bg-indigo-400/60 rounded-full"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
            x: [0, Math.cos(i * 45 * Math.PI / 180) * 40],
            y: [0, Math.sin(i * 45 * Math.PI / 180) * 40]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeOut"
          }}
        />
      ))}
    </>
  );

  return (
    <AnimationToolcall config={agentOperationsConfig} isProcessing={isProcessing}>
      {isProcessing ? fractalParticles : defaultParticles}
    </AnimationToolcall>
  );
};
