// Background blur effect component - extracted from App.tsx
import { memo } from 'react';

// Static decorative blur (currently disabled in App)
interface BackgroundBlurProps {
  position: string;
}

export const BackgroundBlur = memo<BackgroundBlurProps>(({ position }) => (
  <div className={`absolute ${position} w-[720px] h-[720px] rounded-full pointer-events-none`}>
    <div
      className="absolute inset-0 rounded-full blur-[180px] opacity-35"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(169, 131, 247, 0.55) 0%, rgba(169, 131, 247, 0.35) 45%, rgba(169, 131, 247, 0) 70%)',
      }}
    />
    <div
      className="absolute inset-8 rounded-full blur-[240px] opacity-30"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(3, 201, 255, 0.5) 0%, rgba(3, 201, 255, 0.25) 45%, rgba(3, 201, 255, 0) 70%)',
      }}
    />
    <div
      className="absolute -inset-10 rounded-full blur-[300px] opacity-25"
      style={{
        background: 'radial-gradient(circle at 50% 50%, rgba(169, 131, 247, 0.35) 0%, rgba(169, 131, 247, 0.18) 50%, rgba(169, 131, 247, 0) 75%)',
      }}
    />
    <div 
      className="absolute inset-0 rounded-full opacity-10 mix-blend-overlay" 
      style={{ 
        backgroundImage: 'radial-gradient(rgba(0,0,0,0.06) 0.5px, transparent 0.6px)', 
        backgroundSize: '3px 3px' 
      }} 
    />
  </div>
));

BackgroundBlur.displayName = 'BackgroundBlur';
