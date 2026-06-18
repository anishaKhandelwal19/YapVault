/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\components\AudioWaveform.tsx */
'use client';

import React from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  compact?: boolean;
}

export default function AudioWaveform({ isRecording, compact = false }: AudioWaveformProps) {
  // We render 8 animated bars that will animate when recording
  return (
    <div 
      className="waveform-container"
      style={{
        height: compact ? '16px' : '30px',
        marginTop: compact ? '0' : '0.5rem',
        gap: compact ? '2px' : '3px'
      }}
    >
      {[...Array(8)].map((_, i) => (
        <div 
          key={i} 
          className={`wave-bar ${isRecording ? 'active' : ''} ${compact ? 'compact' : ''}`}
          style={{
            width: compact ? '2px' : '3px',
            // Slight variation in heights when inactive to look like a resting state
            height: isRecording ? undefined : `${compact ? 3 + (i % 3) * 1 : 4 + (i % 3) * 2}px`
          }}
        />
      ))}
    </div>
  );
}
