/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\components\ProfileDrawer.tsx */
'use client';

import React, { useEffect, useState } from 'react';
import { X, LogOut, Flame, BookOpen, CheckSquare, AlertCircle } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { getCards, getStreak, RevisionCardData, UserStreak } from '../utils/storage';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

export default function ProfileDrawer({ isOpen, onClose, onSignOut }: ProfileDrawerProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [totalCards, setTotalCards] = useState(0);
  const [streak, setStreak] = useState<UserStreak>({ count: 0, lastRevisedDate: null });
  const [revisedToday, setRevisedToday] = useState(0);
  const [needsReview, setNeedsReview] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Fetch Auth details
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setEmail(user.email || 'Cloud User');
        } else {
          setEmail('Sandbox User');
        }
      });
    } else {
      setEmail('Sandbox User');
    }

    // 2. Fetch Card details and calculate stats
    const fetchStats = async () => {
      const cards = await getCards();
      setTotalCards(cards.length);
      
      const currentStreak = await getStreak();
      setStreak(currentStreak);

      const todayStr = new Date().toISOString().split('T')[0];
      let revisedCount = 0;
      let reviewCount = 0;

      cards.forEach(card => {
        if (card.last_revised_at) {
          const revisedDateStr = card.last_revised_at.split('T')[0];
          if (revisedDateStr === todayStr) {
            revisedCount += 1;
          }
          
          // If revised more than 3 days ago, it needs review
          const lastDate = new Date(card.last_revised_at);
          const diffDays = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 3) {
            reviewCount += 1;
          }
        } else {
          // Never revised
          reviewCount += 1;
        }
      });

      setRevisedToday(revisedCount);
      setNeedsReview(reviewCount);
    };

    fetchStats();
  }, [isOpen]);

  const handleLogOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    onSignOut();
    onClose();
  };

  if (!isOpen) return null;

  const userInitial = email ? email.charAt(0).toUpperCase() : 'U';

  return (
    <>
      {/* Clickable Backdrop overlay to close drawer */}
      <div className="drawer-overlay" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="profile-drawer">
        
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Profile Stats</h2>
          <button className="icon-btn" onClick={onClose} title="Close drawer">
            <X size={20} />
          </button>
        </div>

        {/* User Account Info */}
        <div style={{ textAlign: 'center', margin: '1rem 0 0.5rem 0' }}>
          <div className="profile-avatar-large">
            {userInitial}
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.85rem' }}>
            {email || 'Loading User...'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {supabase && email !== 'Sandbox User' ? 'SECURE CLOUD STORAGE' : 'LOCAL SANDBOX STORAGE'}
          </span>
        </div>

        {/* Statistics Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <span className="card-section-title">Preparation Overview</span>
          
          <div className="profile-stats-grid">
            <div className="profile-stat-box">
              <Flame size={20} style={{ color: 'var(--accent-warning)', margin: '0 auto' }} />
              <span className="profile-stat-num">{streak.count}</span>
              <span className="profile-stat-label">Streak</span>
            </div>
            
            <div className="profile-stat-box">
              <BookOpen size={20} style={{ color: 'var(--accent-primary)', margin: '0 auto' }} />
              <span className="profile-stat-num">{totalCards}</span>
              <span className="profile-stat-label">Cards</span>
            </div>

            <div className="profile-stat-box">
              <CheckSquare size={20} style={{ color: 'var(--accent-success)', margin: '0 auto' }} />
              <span className="profile-stat-num">{revisedToday}</span>
              <span className="profile-stat-label">Revised Today</span>
            </div>

            <div className="profile-stat-box">
              <AlertCircle size={20} style={{ color: 'var(--accent-secondary)', margin: '0 auto' }} />
              <span className="profile-stat-num">{needsReview}</span>
              <span className="profile-stat-label">Due Review</span>
            </div>
          </div>
        </div>

        {/* Footer Info / LogOut */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', color: '#e11d48', borderColor: 'rgba(225,29,72,0.1)' }}
            onClick={handleLogOut}
          >
            <LogOut size={16} />
            <span>{supabase && email !== 'Sandbox User' ? 'Sign Out' : 'Exit Sandbox'}</span>
          </button>
        </div>

      </div>
    </>
  );
}
