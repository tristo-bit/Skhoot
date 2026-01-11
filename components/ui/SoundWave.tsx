import React, { memo } from 'react';

// Pantone palette for soundwave
const WAVE_COLORS = {
  blueTopaz: '#78D5E3',      // PANTONE 13-4036 TCX
  almondCream: '#E8DCC4',    // PANTONE 12-1107 TCX
  lilacSnow: '#D6CED3',      // PANTONE 13-3802 TCX
};

interface SoundWaveProps {
  levels: number[];
  barCount?: number;
}

export const SoundWave = memo<SoundWaveProps>(({ levels, barCount = 28 }) => {
  // Interpolate levels to match barCount
  const interpolatedLevels = Array.from({ length: barCount }, (_, i) => {
    const index = (i / barCount) * levels.length;
    const lower = Math.floor(index);
    const upper = Math.min(lower + 1, levels.length - 1);
    const t = index - lower;
    const baseLevel = levels[lower] * (1 - t) + levels[upper] * t;
    const variation = Math.sin(i * 0.5 + Date.now() * 0.002) * 0.1;
    return Math.max(0.1, Math.min(1, baseLevel + variation));
  });

  // Get color based on bar position for a flowing gradient effect
  const getBarColor = (index: number, level: number) => {
    const position = index / barCount;
    
    // Create a flowing tri-color gradient
    if (position < 0.33) {
      // Blue Topaz to Almond Cream
      const t = position / 0.33;
      return `linear-gradient(to top, ${WAVE_COLORS.blueTopaz}, ${WAVE_COLORS.almondCream})`;
    } else if (position < 0.66) {
      // Almond Cream to Lilac Snow
      return `linear-gradient(to top, ${WAVE_COLORS.almondCream}, ${WAVE_COLORS.lilacSnow})`;
    } else {
      // Lilac Snow to Blue Topaz
      return `linear-gradient(to top, ${WAVE_COLORS.lilacSnow}, ${WAVE_COLORS.blueTopaz})`;
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center gap-[2px] h-10 px-4">
      {interpolatedLevels.map((level, i) => {
        const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
        const centerBoost = 1 - centerDistance * 0.3;
        const height = Math.max(0.2, centerBoost * (0.25 + level * 0.75));
        
        return (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: '4px',
              height: `${Math.max(8, height * 36)}px`,
              background: getBarColor(i, level),
              opacity: 0.7 + (level * 0.3),
              transition: 'height 60ms ease-out, opacity 60ms ease-out',
              boxShadow: `0 0 ${4 + level * 6}px ${level > 0.5 ? WAVE_COLORS.blueTopaz : WAVE_COLORS.lilacSnow}40`,
            }}
          />
        );
      })}
    </div>
  );
});

SoundWave.displayName = 'SoundWave';
