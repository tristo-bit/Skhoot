import React from 'react';
import { motion } from 'framer-motion';
import { AnimationToolcall, type AnimationConfig } from '../ui/AnimationToolcall';

export const commandExecutionConfig: AnimationConfig = {
  primaryColor: 'border-emerald-500/60',
  secondaryColor: 'bg-emerald-500/30',
  ringSpeed: 6,
  ringType: 'solid'
};

interface AnimationCommandExecutionProps {
  isProcessing: boolean;
}

/**
 * Animation for Command Execution tools:
 * executeBash, controlBashProcess, listProcesses, getProcessOutput
 * Behavior: Expanding sonar rings (pulse)
 */
export const AnimationCommandExecution: React.FC<AnimationCommandExecutionProps> = ({ isProcessing }) => {
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

  const pulseParticles = (
    <>
      {/* Expanding Sonar Rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute border border-emerald-500/40 rounded-full"
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 90, height: 90, opacity: 0 }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut"
          }}
        />
      ))}
    </>
  );

  return (
    <AnimationToolcall config={commandExecutionConfig} isProcessing={isProcessing}>
      {isProcessing ? pulseParticles : defaultParticles}
    </AnimationToolcall>
  );
};
