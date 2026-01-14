import React, { memo } from 'react';
import { Mic } from 'lucide-react';
import { IconButton } from '../buttonFormat';
import { audioService } from '../../services/audioService';
import { sttService } from '../../services/sttService';
import { sttConfigStore } from '../../services/sttConfig';

interface RecordButtonProps {
  isRecording: boolean;
  onClick: () => void;
}

export const RecordButton = memo<RecordButtonProps>(({ isRecording, onClick }) => {
  const isOpera = navigator.userAgent.indexOf('OPR') !== -1 || navigator.userAgent.indexOf('Opera') !== -1;
  const preferredProvider = sttConfigStore.getProviderPreference();
  const isSpeechSupported = audioService.isSpeechRecognitionSupported() || sttService.isAvailableSync();

  const getAriaLabel = () => {
    if (isRecording) return 'Stop recording';
    if (isOpera) return 'Voice input (Opera fallback)';
    return 'Start recording';
  };

  const getTitle = () => {
    if (isOpera) return 'Voice input not supported in Opera - click for text input fallback';
    if (isSpeechSupported) return 'Click to start voice recording';
    if (preferredProvider === 'web-speech') return 'Web Speech API is not available on this platform';
    return 'Voice input requires an API key or a local STT server';
  };

  const getBackgroundColor = () => {
    if (isRecording) return '#ef444440';
    if (isOpera) return '#f59e0b20';
    return '#8b5cf620';
  };

  return (
    <div className="relative">
      <IconButton
        icon={
          <Mic 
            size={22} 
            style={{ 
              width: 'calc(22px * var(--icon-scale) * var(--scale-text))', 
              height: 'calc(22px * var(--icon-scale) * var(--scale-text))' 
            }} 
          />
        }
        onClick={onClick}
        variant={isRecording ? "glass" : isOpera ? "glass" : "ghost"}
        size="lg"
        className={isRecording ? 'animate-pulse' : ''}
        aria-label={getAriaLabel()}
        title={getTitle()}
        style={{
          backgroundColor: getBackgroundColor(),
          transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          padding: 'calc(12px * var(--component-scale) * var(--scale))',
          borderRadius: 'calc(16px * var(--component-scale) * var(--scale))',
        }}
      />
      {/* Opera indicator badge */}
      {isOpera && !isRecording && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
          <span className="text-[8px] font-bold text-white">!</span>
        </div>
      )}
    </div>
  );
});

RecordButton.displayName = 'RecordButton';
