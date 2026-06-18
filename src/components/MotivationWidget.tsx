/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\components\MotivationWidget.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { Flame, Lightbulb } from 'lucide-react';
import { getStreak, getDailyQuote, UserStreak } from '../utils/storage';

interface MotivationWidgetProps {
  streakUpdateCounter?: number; // Used to trigger re-reads when user revises cards
}

export default function MotivationWidget({ streakUpdateCounter = 0 }: MotivationWidgetProps) {
  const [streak, setStreak] = useState<UserStreak>({ count: 0, lastRevisedDate: null });
  const [quote, setQuote] = useState({ text: '', author: '' });

  useEffect(() => {
    // Resolve getStreak promise since storage operations are async now
    getStreak().then(currentStreak => {
      setStreak(currentStreak);
    });
    setQuote(getDailyQuote());
  }, [streakUpdateCounter]);

  return (
    <div className="glass-panel motivation-widget">
      <div className="streak-row">
        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Daily Retention</h3>
        <div className="streak-badge">
          <Flame size={16} fill="currentColor" />
          <span>{streak.count} Day Streak</span>
        </div>
      </div>
      
      <div className="quote-box">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Lightbulb size={16} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
          <p className="quote-text">"{quote.text || "Loading daily motivation spark..."}"</p>
        </div>
        <span className="quote-author">— {quote.author || "Tech Knowledge Vault"}</span>
      </div>
      
      {streak.count > 0 ? (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.85rem' }}>
          Last revised: {streak.lastRevisedDate}. Keep it up!
        </p>
      ) : (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.85rem' }}>
          No revision logged today. Speak a concept or review an existing card to activate your streak!
        </p>
      )}
    </div>
  );
}
