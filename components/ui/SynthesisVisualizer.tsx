import React, { useRef, useEffect } from 'react';
import { useAudioAnalyzer } from '../library/useAudioAnalyzer';

interface SynthesisVisualizerProps {
  audioStream: MediaStream | null;
  lineColor?: string;
  isDarkMode?: boolean;
}

const SynthesisVisualizer: React.FC<SynthesisVisualizerProps> = ({
  audioStream,
  lineColor = '#fbd0d0',
  isDarkMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { getVolume } = useAudioAnalyzer(audioStream);

  const isListening = !!audioStream;
  const phaseRef = useRef(0);
  const smoothedVolumeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Use white color in dark mode, otherwise use provided color
  const effectiveLineColor = isDarkMode ? 'rgba(255, 255, 255, 0.9)' : lineColor;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Reset transform then apply pixel ratio
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    const render = () => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;

      const width = currentCanvas.width / dpr;
      const height = currentCanvas.height / dpr;
      const centerY = height / 2;

      // Clean transparent background
      ctx.clearRect(0, 0, width, height);

      // Volume handling with better sensitivity
      const rawVolume = getVolume();

      // Clamp volume with enhanced range
      const clampedVol = Math.min(Math.max(rawVolume, 0), 1);
      
      // Enhanced smoothing for voice characteristics - faster response
      const smoothing = isListening ? 0.25 : 0.12;

      smoothedVolumeRef.current +=
        (clampedVol - smoothedVolumeRef.current) * smoothing;

      const vol = smoothedVolumeRef.current;

      // Optimized timing for voice reactivity - faster movement
      const baseSpeed = isListening ? 0.055 : 0.015;
      const speedBoost = isListening ? vol * 0.4 : 0;
      phaseRef.current += baseSpeed + speedBoost;

      // Voice-optimized amplitude with enhanced dynamic range
      const maxAmplitude = height * 0.48;
      const idleAmplitude = height * 0.05;
      const dynamicAmplitude = Math.pow(vol, 0.75) * height * 0.45;
      const amplitude = Math.min(maxAmplitude, idleAmplitude + dynamicAmplitude);

      // Subtle breathing on idle
      const time = phaseRef.current;
      const idleBreath =
        isListening || vol > 0.01 ? 1 : 0.8 + 0.2 * Math.sin(time * 0.5);

      const effectiveAmplitude = amplitude * idleBreath;

      // Voice-optimized wave configuration with more movement
      const lines = 9;
      const lineSpread = 4.2 + vol * 1.5;
      const baseFrequency = 0.016 + vol * 0.008;
      const secondaryFrequency = 0.028 + vol * 0.012;
      const voiceModulation = 0.042 + vol * 0.018;

      // Global composite for soft glow
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < lines; i++) {
        const indexFromCenter = i - (lines - 1) / 2;

        const layerRatio = Math.abs(indexFromCenter) / ((lines - 1) / 2 || 1);
        const inverseLayer = 1 - layerRatio;

        // Enhanced styling for voice clarity with better reactivity
        const lineWidth =
          1.2 + inverseLayer * 1.4 + (isListening ? vol * 1.2 : 0);
        const alpha =
          0.25 + inverseLayer * 0.6 + (isListening ? vol * 0.35 : 0);

        ctx.beginPath();
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = effectiveLineColor;
        ctx.globalAlpha = alpha;

        // Dynamic glow for voice presence - more reactive
        ctx.shadowBlur = 25 * inverseLayer + (isListening ? vol * 25 : 0);
        ctx.shadowColor = effectiveLineColor;

        const phaseOffset = indexFromCenter * 0.55;
        const localAmplitude =
          effectiveAmplitude * (0.75 + inverseLayer * 0.35) * (1 + vol * 0.5);

        for (let x = 0; x <= width; x += 2.5) {
          const normalizedX = x / width;

          // Sharper envelope for crisp edges
          const windowPower = 3.0;
          const envelope = Math.pow(Math.sin(normalizedX * Math.PI), windowPower);

          // Voice-optimized multi-frequency wave with volume modulation
          const carrier =
            Math.sin(
              x * baseFrequency * (1 + vol * 0.3) +
                phaseRef.current * (1.2 + vol * 0.5) +
                phaseOffset * 1.3
            ) *
            (0.75 + vol * 0.5);

          const modulation =
            Math.sin(
              x * secondaryFrequency * (1.0 + vol * 0.7) -
                phaseRef.current * (0.8 + vol * 0.4) +
                phaseOffset * 0.5
            ) * (0.85 + vol * 0.3);

          // Voice-frequency ripples - more pronounced
          const voiceRipples =
            Math.sin(
              x * voiceModulation * (1 + vol * 0.5) +
                phaseRef.current * (2.8 + vol * 1.2) +
                indexFromCenter * 0.9
            ) *
            (0.15 + vol * 0.35);

          // Harmonics for richer voice representation
          const harmonics =
            Math.sin(
              x * (baseFrequency * 2.5) * (1 + vol * 0.4) -
                phaseRef.current * (1.5 + vol * 0.6)
            ) *
            (0.1 + vol * 0.25) * envelope;

          const combinedWave = (carrier + modulation + voiceRipples + harmonics) * envelope;

          const yOffset = combinedWave * localAmplitude;

          // Dynamic vertical spread - more movement with voice
          const spread =
            indexFromCenter *
            lineSpread *
            envelope *
            (1 + vol * 0.8);

          const y = centerY + yOffset + spread;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      ctx.restore();

      // Enhanced foreground highlight for voice peaks - more reactive
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.3 + vol * 0.5;
      ctx.lineWidth = 1.2 + vol * 1.2;
      ctx.strokeStyle = isDarkMode ? '#ffffff' : '#ffffff';
      ctx.shadowBlur = 15 + vol * 15;
      ctx.shadowColor = effectiveLineColor;

      ctx.beginPath();
      for (let x = 0; x <= width; x += 3.5) {
        const normalizedX = x / width;
        const env = Math.pow(Math.sin(normalizedX * Math.PI), 3.0);

        const carrier =
          Math.sin(
            x * (baseFrequency * 1.4) * (1 + vol * 0.3) +
              phaseRef.current * (1.8 + vol * 0.7)
          ) * (0.85 + vol * 0.6);

        const voiceHarmonic =
          Math.sin(
            x * (voiceModulation * 1.2) * (1 + vol * 0.4) -
              phaseRef.current * (2.2 + vol * 0.8)
          ) * (0.2 + vol * 0.4);

        const yOffset = (carrier + voiceHarmonic) * effectiveAmplitude * 0.65 * env * (1 + vol * 0.3);
        const y = centerY + yOffset;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioStream, getVolume, effectiveLineColor, isListening, isDarkMode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden rounded-2xl"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
};

export default SynthesisVisualizer;