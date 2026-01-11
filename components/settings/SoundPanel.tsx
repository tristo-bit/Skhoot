import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, VolumeX, Volume2, AlertCircle, Terminal, CheckCircle } from 'lucide-react';
import { audioService, AudioDevice } from '../../services/audioService';
import { linuxAudioSetup, LinuxAudioStatus } from '../../services/linuxAudioSetup';
import { PanelHeader, SectionLabel } from './shared';
import { Button, SwitchToggle } from '../buttonFormat';

interface SoundPanelProps {
  onBack: () => void;
}

export const SoundPanel: React.FC<SoundPanelProps> = ({ onBack }) => {
  // Audio settings state
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('');
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(70);
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(40).fill(0));
  const [autoSensitivity, setAutoSensitivity] = useState(true);
  const [manualSensitivity, setManualSensitivity] = useState(50);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [linuxAudioStatus, setLinuxAudioStatus] = useState<LinuxAudioStatus | null>(null);
  const [isFixingLinuxAudio, setIsFixingLinuxAudio] = useState(false);
  const [linuxFixResult, setLinuxFixResult] = useState<{ success: boolean; message: string } | null>(null);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const audioTestRef = useRef<{ stop: () => void } | null>(null);

  // Load audio settings on mount
  useEffect(() => {
    const loadAudioSettings = async () => {
      try {
        setMicPermissionError(null);
        
        // Load saved settings first
        const savedSettings = audioService.getSettings();
        setInputVolume(savedSettings.inputVolume);
        setOutputVolume(savedSettings.outputVolume);
        setAutoSensitivity(savedSettings.autoSensitivity);
        setManualSensitivity(savedSettings.manualSensitivity);
        
        // Check if we already have permission (cached)
        const permStatus = audioService.getPermissionStatus();
        
        if (permStatus.granted) {
          // We have permission, enumerate devices
          setIsRequestingPermission(true);
          const { inputs, outputs } = await audioService.getDevices();
          setInputDevices(inputs);
          setOutputDevices(outputs);
          
          // Set selected devices
          if (savedSettings.selectedInputDevice && inputs.some(d => d.deviceId === savedSettings.selectedInputDevice)) {
            setSelectedInputDevice(savedSettings.selectedInputDevice);
          } else if (inputs.length > 0) {
            setSelectedInputDevice(inputs[0].deviceId);
          }
          
          if (savedSettings.selectedOutputDevice && outputs.some(d => d.deviceId === savedSettings.selectedOutputDevice)) {
            setSelectedOutputDevice(savedSettings.selectedOutputDevice);
          } else if (outputs.length > 0) {
            setSelectedOutputDevice(outputs[0].deviceId);
          }
          setIsRequestingPermission(false);
        } else {
          // No permission yet - just try to enumerate (will show generic labels)
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            const outputs = devices.filter(d => d.kind === 'audiooutput');
            
            // If we got devices with labels, permission was already granted
            if (inputs.some(d => d.label)) {
              setInputDevices(inputs.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || `Microphone ${i + 1}`,
                kind: 'audioinput' as const,
                isDefault: i === 0
              })));
              setOutputDevices(outputs.map((d, i) => ({
                deviceId: d.deviceId,
                label: d.label || 