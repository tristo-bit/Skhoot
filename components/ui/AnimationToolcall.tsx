import React from 'react';
import { motion } from 'framer-motion';

export interface AnimationConfig {
  primaryColor: string;
  secondaryColor: string;
  ringSpeed: number;
  ringType: 'dotted' | 'dashed' | 'solid';
}

export interface AnimationToolcallProps {
  config: AnimationConfig;
  isProcessing: boolean;
  children: React.ReactNode;
}

/**
 * Primitive component for tool call animations
 * Provides the base structure: outer ring, inner ring, core gem, and particle container
 */
export const AnimationToolcall: React.FC<AnimationToolcallProps> = ({
  config,
  isProcessing,
  children
}) => {
  const activeConfig = isProcessing ? config : {
    primaryColor: 'border-slate-400/30',
    secondaryColor: 'bg-slate-400/10',
    ringSpeed: 25,
    ringType: 'dotted' as const
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center rounded-full">
      {/* Outer Ring */}
      <motion.div
        className={`absolute w-[85%] h-[85%] border-2 ${activeConfig.primaryColor} rounded-full ${
          activeConfig.ringType === 'dotted' ? 'border-dotted' : 
          activeConfig.ringType === 'dashed' ? 'border-dashed' : 'border-solid'
        }`}
        animate={{ rotate: 360 }}
        transition={{ 
          duration: activeConfig.ringSpeed, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      />
      
      {/* Inner Ring */}
      <motion.div
        className={`absolute w-[65%] h-[65%] border ${activeConfig.primaryColor} border-opacity-50 rounded-full border-dashed`}
        animate={{ rotate: -360 }}
        transition={{ 
          duration: activeConfig.ringSpeed * 1.5, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      />

      {/* Particles Container */}
      {children}

      {/* Core Gem */}
      <motion.div
        className={`absolute w-3 h-3 rounded-full transition-all duration-500 ${activeConfig.secondaryColor} blur-[1px]`}
        animate={{ 
          scale: isProcessing ? [1, 1.3, 1] : 1,
          opacity: isProcessing ? [0.6, 1, 0.6] : 0.5,
          rotate: isProcessing ? 180 : 0
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </div>
  );
};
