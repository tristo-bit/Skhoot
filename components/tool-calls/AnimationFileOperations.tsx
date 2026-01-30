import React from 'react';
import { motion } from 'framer-motion';
import { AnimationToolcall, type AnimationConfig } from '../ui/AnimationToolcall';

export const fileOperationsConfig: AnimationConfig = {
  primaryColor: 'border-blue-500/60',
  secondaryColor: 'bg-blue-500/30',
  ringSpeed: 4,
  ringType: 'dotted'
};

interface AnimationFileOperationsProps {
  isProcessing: boolean;
}

/**
 * Animation for File Operations tools:
 * readFile, readMultipleFiles, fsWrite, fsAppend, strReplace, deleteFile
 * Behavior: Scanning lines with vertical sweep and data blocks
 */
export const AnimationFileOperations: React.FC<AnimationFileOperationsProps> = ({ isProcessing }) => {
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

  const scanParticles = (
    <>
      {/* Horizontal Scan Lines */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`scan-${i}`}
          className="absolute h-[1px] bg-blue-500/70 w-full max-w-[80px]"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 100, opacity: [0, 0.8, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
          style={{ top: 20 + (i * 12) }}
        />
      ))}
      
      {/* Vertical Sweep */}
      <motion.div
        className="absolute w-[1px] bg-blue-400/50 h-[80%]"
        initial={{ left: "20%", opacity: 0 }}
        animate={{ left: "80%", opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Data Blocks */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`block-${i}`}
          className="absolute h-1 w-3 bg-blue-300/40 rounded-[1px]"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 40, opacity: [0, 1, 0] }}
          transition={{
            duration: 2 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "linear"
          }}
          style={{ top: 30 + (i * 15) }}
        />
      ))}
    </>
  );

  return (
    <AnimationToolcall config={fileOperationsConfig} isProcessing={isProcessing}>
      {isProcessing ? scanParticles : defaultParticles}
    </AnimationToolcall>
  );
};
