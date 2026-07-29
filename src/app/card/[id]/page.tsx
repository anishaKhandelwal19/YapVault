/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\app\card\[id]\page.tsx */
'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import RevisionCard from '../../../components/RevisionCard';
import ProfileDrawer from '../../../components/ProfileDrawer';
import { supabase } from '../../../utils/supabaseClient';
import { getCards, deleteCard, RevisionCardData } from '../../../utils/storage';

interface CardDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CardDetailPage({ params }: CardDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [card, setCard] = useState<RevisionCardData | null>(null);
  
  // Theme & Profile Auth States
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [loadCounter, setLoadCounter] = useState(0);

  const loadCard = async () => {
    const cards = await getCards();
    const found = cards.find(c => c.id === resolvedParams.id);
    if (found) {
      setCard(found);
    } else {
      router.push('/');
    }
  };

  // Initialize auth session
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoadCounter(prev => prev + 1); // trigger reload on auth change
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Fetch card details and sync theme
  useEffect(() => {
    loadCard();

    // Load theme setting
    const storedTheme = localStorage.getItem('tkv_theme') as 'light' | 'dark' | null;
    const initialTheme = storedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [resolvedParams.id, loadCounter]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('tkv_theme', nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      await deleteCard(id);
      router.push('/');
    }
  };

  if (!card) {
    return (
      <div 
        className="dashboard-container" 
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          color: 'var(--text-muted)'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '1rem' }} />
          <p>Loading card details...</p>
        </div>
        <style jsx>{`
          .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            border-top-color: var(--accent-primary);
            animation: spin 0.8s linear infinite;
            display: inline-block;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <main className="dashboard-container" style={{ maxWidth: '850px' }}>
      
      {/* Navigation & Toolbar Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link 
          href="/" 
          className="btn btn-secondary" 
          style={{ 
            display: 'inline-flex', 
            width: 'auto', 
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '10px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Vault</span>
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Theme Switcher Button */}
          <button 
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* User Profile Trigger or Login Button */}
          {user ? (
            <button 
              className="header-avatar-btn"
              onClick={() => setIsProfileOpen(true)}
              title="Open Profile Stats"
            >
              {userInitial}
            </button>
          ) : (
            <Link 
              href="/login"
              className="btn btn-secondary"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: '8px', display: 'flex', gap: '0.25rem', width: 'auto' }}
            >
              Log In
            </Link>
          )}
        </div>
      </div>

      {/* Full Revision Card Display */}
      <RevisionCard 
        card={card}
        onDelete={handleDelete}
        onRevise={loadCard}
        onCardUpdate={loadCard}
      />

      {/* Profile Sidebar Drawer */}
      <ProfileDrawer 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSignOut={() => {
          setUser(null);
          setLoadCounter(prev => prev + 1);
        }}
      />
    </main>
  );
}
