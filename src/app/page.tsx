/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\app\page.tsx */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Mic, 
  MicOff, 
  Search, 
  Sparkles, 
  BookOpen, 
  BrainCircuit, 
  RotateCcw,
  Trash2,
  Calendar,
  Sun,
  Moon,
  MessageSquareText
} from 'lucide-react';
import MotivationWidget from '../components/MotivationWidget';
import AudioWaveform from '../components/AudioWaveform';
import ProfileDrawer from '../components/ProfileDrawer';
import { supabase } from '../utils/supabaseClient';
import { 
  getCards, 
  saveCard, 
  deleteCard, 
  clientSearchCards, 
  RevisionCardData 
} from '../utils/storage';

export default function Dashboard() {
  const [cards, setCards] = useState<RevisionCardData[]>([]);
  const [filteredCards, setFilteredCards] = useState<RevisionCardData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  
  // Note recording & input states
  const [inputMode, setInputMode] = useState<'voice' | 'text' | 'chat'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [chatText, setChatText] = useState('');
  const MAX_CHAT_CHARS = 50000;
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Search recording states
  const [isSearchRecording, setIsSearchRecording] = useState(false);
  
  // Trigger counters for streak updates
  const [streakCounter, setStreakCounter] = useState(0);

  // Theme & Profile Auth States
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // MediaRecorder & Deepgram WebSocket refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const searchMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const searchAudioChunksRef = useRef<Blob[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const searchSocketRef = useRef<WebSocket | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const accumulatedSearchQueryRef = useRef<string>('');
  const sentChunksCountRef = useRef<number>(0);
  const searchSentChunksCountRef = useRef<number>(0);

  // Initialize session and auth state change subscription
  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setStreakCounter(prev => prev + 1); // trigger list refresh on sign in/out
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  // Load cards and theme on mount
  useEffect(() => {
    const loadData = async () => {
      const loadedCards = await getCards();
      setCards(loadedCards);
      setFilteredCards(loadedCards);
    };
    loadData();

    // Initialize Theme
    const storedTheme = localStorage.getItem('tkv_theme') as 'light' | 'dark' | null;
    const initialTheme = storedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [streakCounter, user]);

  // Filter cards when search filter query changes
  useEffect(() => {
    const results = clientSearchCards(filterQuery, cards);
    setFilteredCards(results);
  }, [filterQuery, cards]);

  // Handle Theme Toggle
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

  // Start MediaRecorder audio recording and connect to Deepgram WebSocket
  const startRecording = async () => {
    try {
      setApiError(null);
      setAudioBase64(null);
      setAudioMimeType('');
      setTranscript(''); // Clear old transcript
      accumulatedTranscriptRef.current = '';
      audioChunksRef.current = [];
      sentChunksCountRef.current = 0;

      // 1. Access microphone immediately to start recording (zero latency UI update)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine MIME type
      let selectedMimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
        selectedMimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
          selectedMimeType = '';
        }
      }

      // 2. Initialize and start MediaRecorder immediately
      const recorder = selectedMimeType 
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
        
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            // If the buffer has already been flushed, stream directly
            if (sentChunksCountRef.current >= audioChunksRef.current.length - 1) {
              socketRef.current.send(event.data);
              sentChunksCountRef.current = audioChunksRef.current.length;
            }
          }
        }
      };
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        
        const finalMimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Payload = base64data.split(',')[1];
          setAudioBase64(base64Payload);
          setAudioMimeType(finalMimeType);
        };
      };
      
      mediaRecorderRef.current = recorder;
      recorder.start(250); // Start recording instantly
      setIsRecording(true); // Lighting up UI immediately!

      // 3. Connect to Deepgram in parallel in the background
      const connectDeepgram = async () => {
        try {
          const tokenRes = await fetch('/api/deepgram-token', { method: 'POST' });
          const tokenData = await tokenRes.json();
          if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(tokenData.error || 'Failed to fetch transcription token');
          }
          const token = tokenData.access_token;

          const socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true&smart_formatting=true', [
            'Bearer',
            token
          ]);

          socket.onopen = () => {
            console.log('Deepgram WebSocket connected for Concept Recorder. Flushing buffer...');
            socketRef.current = socket;
            
            // Flush all buffered chunks to the socket
            while (sentChunksCountRef.current < audioChunksRef.current.length) {
              const chunk = audioChunksRef.current[sentChunksCountRef.current];
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(chunk);
                sentChunksCountRef.current++;
              } else {
                break;
              }
            }
          };

          socket.onmessage = (msgEvent) => {
            try {
              const received = JSON.parse(msgEvent.data);
              const transcriptSegment = received.channel?.alternatives?.[0]?.transcript;
              
              if (transcriptSegment) {
                if (received.is_final) {
                  accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + transcriptSegment).trim();
                  setTranscript(accumulatedTranscriptRef.current);
                } else {
                  setTranscript((accumulatedTranscriptRef.current + ' ' + transcriptSegment).trim());
                }
              }
            } catch (err) {
              console.error('Error parsing Deepgram message:', err);
            }
          };

          socket.onerror = (e) => {
            console.error('Deepgram WebSocket error event:', e);
          };

          socket.onclose = (event) => {
            console.warn('Deepgram WebSocket closed. Code:', event.code, 'Reason:', event.reason || 'No reason provided');
            if (event.code !== 1000 && event.code !== 1005) {
              setApiError(`Deepgram WebSocket disconnected: ${event.reason || 'Code ' + event.code}`);
            }
          };
        } catch (err: any) {
          console.error('Deepgram background connection failed:', err);
        }
      };

      connectDeepgram();
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setApiError(err.message || 'Failed to start voice recorder. Please check microphone permissions.');
    }
  };

  // Stop MediaRecorder audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
  };

  // Handle Note Recording Mic Toggle
  const toggleRecording = () => {
    if (isSearchRecording) {
      stopSearchRecording();
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Start MediaRecorder for search voice input and connect to Deepgram WS
  const startSearchRecording = async () => {
    try {
      if (isRecording) {
        stopRecording();
      }
      
      setSearchQuery('');
      setFilterQuery('');
      accumulatedSearchQueryRef.current = '';
      searchAudioChunksRef.current = [];
      searchSentChunksCountRef.current = 0;

      // 1. Access Microphone immediately
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine MIME type
      let selectedMimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
        selectedMimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
          selectedMimeType = '';
        }
      }

      // 2. Initialize and start MediaRecorder immediately
      const recorder = selectedMimeType 
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
        
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          searchAudioChunksRef.current.push(event.data);
          
          if (searchSocketRef.current && searchSocketRef.current.readyState === WebSocket.OPEN) {
            // Stream directly if all previous chunks have been flushed
            if (searchSentChunksCountRef.current >= searchAudioChunksRef.current.length - 1) {
              searchSocketRef.current.send(event.data);
              searchSentChunksCountRef.current = searchAudioChunksRef.current.length;
            }
          }
        }
      };
      
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        const finalMimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(searchAudioChunksRef.current, { type: finalMimeType });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Payload = base64data.split(',')[1];
          
          try {
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ audioData: base64Payload, mimeType: finalMimeType }),
            });
            const data = await res.json();
            if (data.text) {
              setSearchQuery(data.text);
              setFilterQuery(data.text);
            } else {
              setFilterQuery(accumulatedSearchQueryRef.current);
            }
          } catch (err) {
            console.error('Failed to transcribe search:', err);
            setFilterQuery(accumulatedSearchQueryRef.current);
          }
        };
      };
      
      searchMediaRecorderRef.current = recorder;
      recorder.start(250); // Start recording immediately
      setIsSearchRecording(true); // Light up UI immediately!

      // 3. Connect to Deepgram in parallel in the background
      const connectDeepgramSearch = async () => {
        try {
          const tokenRes = await fetch('/api/deepgram-token', { method: 'POST' });
          const tokenData = await tokenRes.json();
          if (!tokenRes.ok || !tokenData.access_token) {
            throw new Error(tokenData.error || 'Failed to fetch transcription token');
          }
          const token = tokenData.access_token;

          const socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&interim_results=true&smart_formatting=true', [
            'Bearer',
            token
          ]);

          socket.onopen = () => {
            console.log('Deepgram WebSocket connected for Search. Flushing buffer...');
            searchSocketRef.current = socket;
            
            // Flush all buffered chunks to the socket
            while (searchSentChunksCountRef.current < searchAudioChunksRef.current.length) {
              const chunk = searchAudioChunksRef.current[searchSentChunksCountRef.current];
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(chunk);
                searchSentChunksCountRef.current++;
              } else {
                break;
              }
            }
          };

          socket.onmessage = (msgEvent) => {
            try {
              const received = JSON.parse(msgEvent.data);
              const transcriptSegment = received.channel?.alternatives?.[0]?.transcript;
              
              if (transcriptSegment) {
                if (received.is_final) {
                  accumulatedSearchQueryRef.current = (accumulatedSearchQueryRef.current + ' ' + transcriptSegment).trim();
                  setSearchQuery(accumulatedSearchQueryRef.current);
                } else {
                  setSearchQuery((accumulatedSearchQueryRef.current + ' ' + transcriptSegment).trim());
                }
              }
            } catch (err) {
              console.error('Error parsing Deepgram search message:', err);
            }
          };

          socket.onerror = (e) => {
            console.error('Deepgram search WebSocket error event:', e);
          };

          socket.onclose = (event) => {
            console.warn('Deepgram search WebSocket closed. Code:', event.code, 'Reason:', event.reason || 'No reason provided');
            if (event.code !== 1000 && event.code !== 1005) {
              alert(`Deepgram Search WebSocket disconnected: ${event.reason || 'Code ' + event.code}`);
            }
          };
        } catch (err: any) {
          console.error('Deepgram search background connection failed:', err);
        }
      };

      connectDeepgramSearch();
    } catch (err: any) {
      console.error('Error starting search recording:', err);
      alert(err.message || 'Could not start search recording. Please check microphone permissions.');
    }
  };

  // Stop MediaRecorder for search voice input
  const stopSearchRecording = () => {
    if (searchMediaRecorderRef.current && isSearchRecording) {
      searchMediaRecorderRef.current.stop();
      setIsSearchRecording(false);
    }
    if (searchSocketRef.current) {
      if (searchSocketRef.current.readyState === WebSocket.OPEN) {
        searchSocketRef.current.close();
      }
      searchSocketRef.current = null;
    }
  };

  // Handle Search Mic Toggle
  const toggleSearchRecording = () => {
    if (isRecording) {
      stopRecording();
    }

    if (isSearchRecording) {
      stopSearchRecording();
    } else {
      setSearchQuery('');
      startSearchRecording();
    }
  };

  // Call Gemini API Route to structure card
  const handleAIStructure = async () => {
    if (inputMode === 'text' && !transcript.trim()) return;
    if (inputMode === 'voice' && !audioBase64) return;

    setIsProcessingAI(true);
    setApiError(null);

    try {
      const payload = inputMode === 'voice'
        ? { audioData: audioBase64, mimeType: audioMimeType }
        : { transcript };

      const response = await fetch('/api/structure-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to structure card');
      }

      await saveCard({
        title: data.title,
        definition: data.definition,
        how_it_works: data.how_it_works,
        use_cases: data.use_cases,
        interview_questions: data.interview_questions,
        common_mistakes: data.common_mistakes,
        related_concepts: data.related_concepts,
      });

      setStreakCounter(prev => prev + 1);
      setTranscript('');
      setAudioBase64(null);
      setAudioMimeType('');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An error occurred during AI structuring.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Call Gemini API Route to structure card from AI chat paste
  const handleChatStructure = async () => {
    if (!chatText.trim()) return;

    setIsProcessingAI(true);
    setApiError(null);

    try {
      const response = await fetch('/api/structure-from-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to structure card from chat');
      }

      await saveCard({
        title: data.title,
        definition: data.definition,
        how_it_works: data.how_it_works,
        use_cases: data.use_cases,
        interview_questions: data.interview_questions,
        common_mistakes: data.common_mistakes,
        related_concepts: data.related_concepts,
        ai_chat_summary: data.ai_chat_summary,
        ai_chat_detail: data.ai_chat_detail,
      });

      setStreakCounter(prev => prev + 1);
      setChatText('');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'An error occurred during AI chat structuring.');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      await deleteCard(id);
      setStreakCounter(prev => prev + 1); // trigger reload
    }
  };

  const getRevisionStatusText = (lastRevisedAt: string | null) => {
    if (!lastRevisedAt) return { text: 'Not revised yet', isDue: true };
    
    const lastDate = new Date(lastRevisedAt);
    const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return { text: 'Revised today', isDue: false };
    } else if (diffDays === 1) {
      return { text: 'Revised yesterday', isDue: false };
    } else {
      return { text: `Revised ${diffDays} days ago`, isDue: diffDays >= 3 };
    }
  };

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <main className="dashboard-container">
      {/* App Header */}
      <header className="header">
        <div className="logo-section">
          <div className="logo-icon">
            <BrainCircuit size={24} />
          </div>
          <h1 className="logo-title">Tech Knowledge Vault</h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Theme Switcher Button */}
          <button 
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Profile Trigger or Login Button */}
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
      </header>

      {/* Main Grid */}
      <div className="main-grid">
        
        {/* Left Column: Recording & Motivations */}
        <section className="sidebar">
          
          {/* Motivation Quote & Streak Widget */}
          <MotivationWidget streakUpdateCounter={streakCounter} />

          {/* Concept Input Panel */}
          <div className="glass-panel recording-panel">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Record or Type Concept</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Explain a concept you just learned. Gemini will build your study card.
            </p>

            {/* Mode Toggle Button Tabs */}
            <div className="mode-toggle" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
              <button 
                className={`tab-btn ${inputMode === 'voice' ? 'active' : ''}`}
                onClick={() => { setInputMode('voice'); setApiError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: inputMode === 'voice' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: inputMode === 'voice' ? 600 : 400,
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  borderBottom: inputMode === 'voice' ? '2px solid var(--accent-primary)' : '2px solid transparent'
                }}
              >
                Voice Recorder
              </button>
              <button 
                className={`tab-btn ${inputMode === 'text' ? 'active' : ''}`}
                onClick={() => { setInputMode('text'); setApiError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: inputMode === 'text' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: inputMode === 'text' ? 600 : 400,
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  borderBottom: inputMode === 'text' ? '2px solid var(--accent-primary)' : '2px solid transparent'
                }}
              >
                Type Concept
              </button>
              <button 
                className={`tab-btn ${inputMode === 'chat' ? 'active' : ''}`}
                onClick={() => { setInputMode('chat'); setApiError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: inputMode === 'chat' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontWeight: inputMode === 'chat' ? 600 : 400,
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  borderBottom: inputMode === 'chat' ? '2px solid var(--accent-primary)' : '2px solid transparent'
                }}
              >
              From AIs
              </button>
            </div>

            {inputMode === 'voice' ? (
              <>
                <div className="record-btn-container">
                  <button 
                    className={`record-btn ${isRecording ? 'recording' : ''}`}
                    onClick={toggleRecording}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                  </button>
                  <div className="record-glow-ring" />
                </div>

                <span className={`record-status-text ${isRecording ? 'recording' : ''}`}>
                  {isRecording ? 'Listening... Click microphone or Stop button below' : 'Click to start speaking'}
                </span>

                {/* Waveform Visualization */}
                <AudioWaveform isRecording={isRecording} />

                {isRecording && (
                  <button 
                    className="btn"
                    onClick={toggleRecording}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginTop: '0.75rem',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <MicOff size={16} /> Stop Recording
                  </button>
                )}

                {/* Live Speech Recognition Feedback */}
                {isRecording && transcript && (
                  <div 
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      maxHeight: '100px',
                      overflowY: 'auto',
                      width: '100%',
                      boxSizing: 'border-box',
                      fontStyle: 'italic',
                      borderLeft: '3px solid var(--accent-primary)'
                    }}
                  >
                    "{transcript}"
                  </div>
                )}

                {audioBase64 && !isRecording && (
                  <>
                    {transcript && (
                      <div 
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.75rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          maxHeight: '100px',
                          overflowY: 'auto',
                          width: '100%',
                          boxSizing: 'border-box'
                        }}
                      >
                        <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Live Transcript Preview</strong>
                        <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>{transcript}</p>
                      </div>
                    )}
                    <div className="audio-success-indicator" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                      <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 500 }}>Audio recorded successfully! Ready to structure.</span>
                    </div>
                  </>
                )}
              </>
            ) : null}

            {inputMode === 'text' && (
              <textarea
                className="concept-textarea"
                placeholder="Explain your technical concept here... (e.g. What is it, how does it work, when to use it)"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                style={{
                  width: '100%',
                  height: '150px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginBottom: '0.5rem'
                }}
              />
            )}

            {inputMode === 'chat' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <MessageSquareText size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Paste your AI conversation below. We'll extract the concept & build your card.</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <textarea
                    className="concept-textarea"
                    placeholder="Paste your ChatGPT, Claude, or Gemini conversation here...&#10;&#10;Example:&#10;User: What is a closure in JavaScript?&#10;AI: A closure is a function that has access to..."
                    value={chatText}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_CHAT_CHARS) {
                        setChatText(e.target.value);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '200px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      marginBottom: '0.25rem'
                    }}
                  />
                  <div className="chat-char-counter" style={{
                    textAlign: 'right',
                    fontSize: '0.7rem',
                    color: chatText.length > MAX_CHAT_CHARS * 0.9 ? 'var(--accent-secondary)' : 'var(--text-muted)',
                    marginBottom: '0.5rem'
                  }}>
                    {chatText.length.toLocaleString()} / {MAX_CHAT_CHARS.toLocaleString()}
                  </div>
                </div>
              </>
            )}

            {apiError && (
              <p style={{ fontSize: '0.8rem', color: 'var(--accent-secondary)', marginTop: '0.5rem' }}>
                {apiError}
              </p>
            )}

            {/* Action Buttons */}
            <div className="action-row" style={{ marginTop: '1rem' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setTranscript('');
                  setAudioBase64(null);
                  setAudioMimeType('');
                  setChatText('');
                }}
                disabled={
                  (inputMode === 'text' && !transcript) ||
                  (inputMode === 'voice' && !audioBase64) ||
                  (inputMode === 'chat' && !chatText) ||
                  isRecording ||
                  isProcessingAI
                }
              >
                <RotateCcw size={16} />
                Clear
              </button>
              <button 
                className="btn btn-primary"
                onClick={inputMode === 'chat' ? handleChatStructure : handleAIStructure}
                disabled={
                  (inputMode === 'text' && !transcript.trim()) ||
                  (inputMode === 'voice' && !audioBase64) ||
                  (inputMode === 'chat' && !chatText.trim()) ||
                  isRecording ||
                  isProcessingAI
                }
              >
                {isProcessingAI ? (
                  <>
                    <div className="spinner" />
                    Structuring...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI Structure Card
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Cards & Search */}
        <section className="content-section">
          
          {/* Search Panel */}
          <div className="glass-panel search-panel">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon-left" />
              <textarea 
                className="search-input"
                placeholder="Search concepts, definitions, or related topics..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFilterQuery(e.target.value);
                }}
                rows={1}
                style={{
                  resize: 'none',
                  minHeight: '42px',
                  maxHeight: '100px',
                  paddingTop: '0.65rem',
                  paddingBottom: '0.65rem',
                  lineHeight: '1.4',
                  boxSizing: 'border-box',
                  overflowY: 'auto'
                }}
              />
              <button 
                className={`mic-search-btn ${isSearchRecording ? 'active' : ''}`}
                onClick={toggleSearchRecording}
                title={isSearchRecording ? 'Stop search recording' : 'Search using voice'}
              >
                {isSearchRecording ? <MicOff size={18} style={{ color: '#ef4444' }} /> : <Mic size={18} />}
              </button>
            </div>
            
            {/* Visual Indicator showing that search voice is recording */}
            {isSearchRecording && (
              <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <span className="search-pulse-dot" /> Listening to search...
                </span>
                <AudioWaveform isRecording={isSearchRecording} compact={true} />
                <button 
                  onClick={toggleSearchRecording}
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '4px',
                    color: '#ef4444',
                    fontSize: '0.7rem',
                    padding: '0.2rem 0.5rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <MicOff size={10} /> Stop & Search
                </button>
              </div>
            )}

            {filterQuery && (
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Showing matches for "{filterQuery}"</span>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setFilterQuery('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Cards Container */}
          <div className="section-header">
            <h3 className="section-title">My Vault ({filteredCards.length} cards)</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Click card to expand details
            </span>
          </div>

          <div className="cards-container">
            {filteredCards.length > 0 ? (
              filteredCards.map(card => {
                const status = getRevisionStatusText(card.last_revised_at);
                return (
                  <Link 
                    href={`/card/${card.id}`} 
                    key={card.id} 
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className="glass-panel card-outer hover-scale-card">
                      <div className="card-header-bar" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="card-title-group">
                          <span className="card-tag">Revision Card</span>
                          <h2 className="card-title" style={{ fontSize: '1.25rem', marginTop: '0.2rem' }}>{card.title}</h2>
                        </div>
                        <div className="card-actions-top">
                          <button 
                            className="icon-btn delete" 
                            onClick={(e) => {
                              e.preventDefault(); // prevent navigation
                              e.stopPropagation(); // stop click bubbling
                              handleDelete(card.id);
                            }} 
                            title="Delete card"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      <div 
                        className="card-footer" 
                        style={{ 
                          borderTop: '1px solid var(--border-glass)', 
                          padding: '0.85rem 1.5rem', 
                          background: 'rgba(0, 0, 0, 0.03)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div className={`revise-indicator ${status.isDue ? 'due' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={14} />
                          <span>{status.text}</span>
                        </div>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                          View Details →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="glass-panel empty-state">
                <div className="empty-state-icon">
                  <BookOpen size={32} />
                </div>
                <h4 style={{ fontWeight: 600 }}>No Revision Cards Found</h4>
                <p style={{ fontSize: '0.85rem', maxHeight: '80px', maxWidth: '320px' }}>
                  {searchQuery 
                    ? "Try adjusting your search query, or double check spelling."
                    : "Your vault is empty. Record your first study concept using the microphone panel on the left!"
                  }
                </p>
              </div>
            )}
          </div>

        </section>

      </div>

      {/* Profile Sidebar Drawer */}
      <ProfileDrawer 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSignOut={() => {
          setUser(null);
          setStreakCounter(prev => prev + 1);
        }}
      />

      {/* Embedded CSS for spinner and specific local components */}
      <style jsx>{`
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
          margin-right: 6px;
          display: inline-block;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
