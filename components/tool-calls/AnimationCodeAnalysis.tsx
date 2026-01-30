import React from 'react';
import { motion } from 'framer-motion';
import { AnimationToolcall, type AnimationConfig } from '../ui/AnimationToolcall';

export const codeAnalysisConfig: AnimationConfig = {
  primaryColor: 'border-orange-500/60',
  secondaryColor: 'bg-orange-500/30',
  ringSpeed: 3,
  ringType: 'dashed'
};

interface AnimationCodeAnalysisProps {
  isProcessing: boolean;
}

/**
 * Animation for Code Analysis tools:
 * getDiagnostics
 * Behavior: Digital rain (matrix style)
 */
export const AnimationCodeAnalysis: React.FC<AnimationCodeAnalysisProps> = ({ isProcessing }) => {
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

  const matrixParticles = (
    <>
      {/* Digital Rain */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`matrix-${i}`}
          className="absolute w-[2px] h-4 bg-orange-500/60 rounded-full"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 60, opacity: [0, 1, 0] }}
          transition={{
            duration: 0.8 + Math.random() * 0.5,
            repeat: Infinity,
            delay: Math.random(),
            ease: "linear"
          }}
          style={{ left: 30 + (i * 15) }}
        />
      ))}
    </>
  );

  return (
    <AnimationToolcall config={codeAnalysisConfig} isProcessing={isProcessing}>
      {isProcessing ? matrixParticles : defaultParticles}
    </AnimationToolcall>
  );
};
