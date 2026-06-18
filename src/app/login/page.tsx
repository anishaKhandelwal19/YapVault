/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\app\login\page.tsx */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrainCircuit, Mail, Lock, LogIn, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { syncLocalCardsToCloud } from '../../utils/storage';

// Inline SVGs for brand logos to avoid Lucide version incompatibilities
const GithubIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Sync theme on mount
    const storedTheme = localStorage.getItem('tkv_theme') as 'light' | 'dark' | null;
    const initialTheme = storedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }

    // If already logged in, redirect home
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push('/');
        }
      });
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }

    if (!supabase) {
      setErrorMsg('Supabase is not configured. Redirecting to local sandbox mode...');
      setTimeout(() => {
        router.push('/');
      }, 2000);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (activeTab === 'login') {
        // Log in
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        
        // Sync local storage cards to the cloud
        await syncLocalCardsToCloud();
        setSuccessMsg('Logged in successfully! Redirecting...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 1000);
      } else {
        // Sign up
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        
        setSuccessMsg('Sign up successful! Please check your email for confirmation.');
        setEmail('');
        setPassword('');
        setActiveTab('login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'github' | 'google') => {
    if (!supabase) {
      setErrorMsg('Supabase is not configured.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'OAuth authentication failed.');
      setLoading(false);
    }
  };

  return (
    <main className="dashboard-container login-container">
      <div className="glass-panel login-card">
        
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <div className="logo-icon" style={{ width: 'fit-content' }}>
            <BrainCircuit size={28} />
          </div>
          <h1 className="logo-title" style={{ fontSize: '1.6rem' }}>Tech Knowledge Vault</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Your personal placement prep study vault
          </p>
        </div>

        {/* Tab Selector */}
        <div className="auth-tabs">
          <button 
            className={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Log In
          </button>
          <button 
            className={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="email-input"
                type="email" 
                className="form-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label className="form-label" htmlFor="password-input">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                id="password-input"
                type="password" 
                className="form-input"
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#e11d48', fontSize: '0.8rem', background: 'rgba(225,29,72,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{ color: 'var(--accent-success)', fontSize: '0.8rem', background: 'rgba(5,150,105,0.05)', padding: '0.75rem', borderRadius: '8px' }}>
              {successMsg}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', borderRadius: '10px' }}
            disabled={loading}
          >
            {loading ? (
              <div className="spinner" style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '50%', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <>
                {activeTab === 'login' ? 'Log In to Vault' : 'Create Vault Account'}
                <LogIn size={16} style={{ marginLeft: '4px' }} />
              </>
            )}
          </button>
        </form>

        {/* OAuth display */}
        {supabase ? (
          <>
            <div className="divider">Or continue with</div>

            <div className="social-btn-row">
              <button className="social-btn" onClick={() => handleOAuth('github')} disabled={loading}>
                <GithubIcon />
                <span>GitHub</span>
              </button>
              <button className="social-btn" onClick={() => handleOAuth('google')} disabled={loading}>
                <GoogleIcon />
                <span>Google</span>
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <Link href="/" className="btn btn-secondary" style={{ display: 'inline-flex', width: 'auto' }}>
              Enter Local Sandbox Mode
              <ArrowRight size={14} style={{ marginLeft: '4px' }} />
            </Link>
          </div>
        )}

      </div>
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
