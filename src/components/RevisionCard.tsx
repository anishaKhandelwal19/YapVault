/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\components\RevisionCard.tsx */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Share2, CheckCircle, Calendar, Sparkles, BookOpen, GraduationCap, AlertTriangle, MessageSquareText, ChevronDown, ChevronUp, Brain, Star, Zap, Lightbulb, ExternalLink, Send, Pin, Loader2, Bot } from 'lucide-react';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RevisionCardData, markRevised, updateMasteryLevel, updateCard } from '../utils/storage';

const preprocessMarkdown = (text: string | undefined | null): string => {
  if (!text) return '';
  let cleaned = text
    .replace(/<ul>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol>/g, '\n')
    .replace(/<\/ol>/g, '\n')
    .replace(/<li>/g, '\n- ')
    .replace(/<\/li>/g, '')
    .replace(/<p>/g, '\n\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<br\s*\/?>/g, '\n');

  cleaned = cleaned.replace(/([^\n])\s+(\d+\.\s+)/g, '$1\n$2');
  return cleaned;
};

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface SaveMenuState {
  messageIndex: number;
  open: boolean;
}

interface RevisionCardProps {
  card: RevisionCardData;
  onDelete: (id: string) => void;
  onRevise: () => void;
  onCardUpdate?: () => void;
}

export default function RevisionCard({ card, onDelete, onRevise, onCardUpdate }: RevisionCardProps) {
  const [activeTab, setActiveTab] = useState<'concept' | 'prep' | 'explain' | 'chat' | 'askai'>('concept');
  const hasAiChat = !!(card.ai_chat_summary || card.ai_chat_detail);

  // In-card AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [saveMenu, setSaveMenu] = useState<SaveMenuState>({ messageIndex: -1, open: false });
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);
  const [isExporting, setIsExporting] = useState(false);
  const [isRevisedAnimating, setIsRevisedAnimating] = useState(false);

  const [openQs, setOpenQs] = useState<Record<number, boolean>>({});

  const toggleQ = (index: number) => {
    setOpenQs(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const markdownComponents = {
    code({ node, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match && !String(children).includes('\n');
      return !isInline ? (
        <pre className="card-how-works">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code 
          className="inline-code"
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            padding: '0.15rem 0.35rem',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85em',
            color: 'var(--accent-primary)'
          }}
          {...props}
        >
          {children}
        </code>
      );
    }
  };

  const handleMarkRevised = async () => {
    setIsRevisedAnimating(true);
    await markRevised(card.id);
    setTimeout(() => {
      setIsRevisedAnimating(false);
      onRevise();
    }, 600);
  };

  const sendChatMessage = async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;
    setChatInput('');
    setChatError(null);
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', text }];
    setChatMessages(newMessages);
    setIsChatLoading(true);
    try {
      const res = await fetch('/api/card-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card, messages: chatMessages, userMessage: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setChatError(data.error || 'Failed to get a response. Please try again.');
      } else {
        setChatMessages([...newMessages, { role: 'model', text: data.reply }]);
      }
    } catch (e: any) {
      setChatError('Network error. Please check your connection.');
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveSnippetToCard = async (messageText: string, target: 'details' | 'qa') => {
    setSaveMenu({ messageIndex: -1, open: false });
    try {
      if (target === 'details') {
        const separator = '\n\n---\n*Saved from AI Chat:*\n';
        const newHowItWorks = (card.how_it_works || '') + separator + messageText;
        await updateCard(card.id, { how_it_works: newHowItWorks });
        setSaveToast('✅ Saved to Details / Mechanics!');
      } else {
        const newQ = { question: '(Saved from AI Chat)', answer: messageText };
        const updatedQs = [...(card.interview_questions || []), newQ];
        await updateCard(card.id, { interview_questions: updatedQs });
        setSaveToast('✅ Saved as Interview Q&A!');
      }
      // Reload card from DB so the UI reflects the newly saved data
      if (onCardUpdate) onCardUpdate();
    } catch (e) {
      setSaveToast('❌ Failed to save. Try again.');
    }
    setTimeout(() => setSaveToast(null), 3000);
  };



  const handleExport = async () => {
    const cardElement = document.getElementById(`card-capture-${card.id}`);
    if (!cardElement) return;

    try {
      setIsExporting(true);

      const outerWrapper = document.createElement('div');
      outerWrapper.style.padding = '40px';
      outerWrapper.style.width = `${cardElement.offsetWidth + 80}px`;
      outerWrapper.style.background = '#F8FAFC';
      outerWrapper.style.display = 'flex';
      outerWrapper.style.justifyContent = 'center';
      outerWrapper.style.alignItems = 'center';
      outerWrapper.style.position = 'absolute';
      outerWrapper.style.left = '-9999px';
      outerWrapper.style.top = '-9999px';
      document.body.appendChild(outerWrapper);

      const clonedCard = cardElement.cloneNode(true) as HTMLElement;
      clonedCard.style.width = `${cardElement.offsetWidth}px`;
      clonedCard.style.margin = '0';
      clonedCard.style.boxShadow = '0 10px 30px rgba(0,0,0,0.05)';
      clonedCard.style.border = '1px solid #E2E8F0';

      const cloneConcept = clonedCard.querySelector('.tab-content-concept') as HTMLElement;
      const clonePrep = clonedCard.querySelector('.tab-content-prep') as HTMLElement;
      const cloneExplain = clonedCard.querySelector('.tab-content-explain') as HTMLElement;
      if (cloneConcept) cloneConcept.style.display = 'flex';
      if (clonePrep) clonePrep.style.display = 'flex';
      if (cloneExplain) cloneExplain.style.display = 'flex';

      const cloneTabs = clonedCard.querySelector('.card-tabs');
      if (cloneTabs) cloneTabs.remove();

      const cloneActions = clonedCard.querySelector('.card-actions-top');
      if (cloneActions) cloneActions.remove();
      const cloneFooter = clonedCard.querySelector('.card-footer');
      if (cloneFooter) cloneFooter.remove();

      outerWrapper.appendChild(clonedCard);

      const canvas = await html2canvas(outerWrapper, {
        backgroundColor: '#F8FAFC',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      document.body.removeChild(outerWrapper);

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${card.title.toLowerCase().replace(/\s+/g, '-')}-revision-card.png`;
      link.click();
    } catch (err) {
      console.error('Failed to export image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getLastRevisedText = () => {
    if (!card.last_revised_at) {
      return 'Never revised';
    }
    const lastDate = new Date(card.last_revised_at);
    const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Revised today';
    if (diffDays === 1) return 'Revised yesterday';
    return `Revised ${diffDays} days ago`;
  };


  return (
    <div 
      className={`glass-panel card-outer ${isRevisedAnimating ? 'revised-glow-animation' : ''}`} 
      id={`card-capture-${card.id}`}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        color: '#0F172A',
        fontFamily: 'var(--font-sans)',
        overflow: 'visible'
      }}
    >
      <style jsx global>{`
        @keyframes revised-glow {
          0% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); border-color: #E2E8F0; }
          50% { box-shadow: 0 0 30px rgba(37, 99, 235, 0.3); border-color: #2563EB; transform: scale(1.005); }
          100% { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); border-color: #E2E8F0; }
        }
        .revised-glow-animation {
          animation: revised-glow 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
      `}</style>

      {/* Card Header */}
      <div className="card-header-bar" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FFFFFF', borderRadius: '16px 16px 0 0' }}>
        <div className="card-title-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span className="card-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start', fontSize: '0.75rem', fontWeight: 600, color: '#2563EB', background: 'rgba(37, 99, 235, 0.06)', padding: '0.2rem 0.6rem', borderRadius: '12px', width: 'fit-content' }}>
            📁 {card.folder_path && card.folder_path !== '/' ? card.folder_path : 'Root'}
          </span>
          <h2 className="card-title" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{card.title}</h2>
        </div>
        <div className="card-actions-top" style={{ display: 'flex', gap: '0.35rem', alignSelf: 'flex-start' }}>
          <button 
            className="icon-btn" 
            onClick={handleExport} 
            title="Export card as image"
            disabled={isExporting}
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <Share2 size={15} style={{ color: isExporting ? '#94A3B8' : '#2563EB' }} />
          </button>
          <button 
            className="icon-btn delete" 
            onClick={() => onDelete(card.id)} 
            title="Delete card"
            style={{
              padding: '0.4rem',
              borderRadius: '8px',
              border: '1px solid #FEE2E2',
              background: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <Trash2 size={15} style={{ color: '#DC2626' }} />
          </button>
        </div>
      </div>

      {/* 🧭 Segmented tabs inside card */}
      <div className="card-tabs" style={{ display: 'flex', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', padding: '0 0.5rem' }}>
        <button 
          className={`card-tab-btn concept-tab ${activeTab === 'concept' ? 'active' : ''}`}
          onClick={() => setActiveTab('concept')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.85rem 1rem',
            border: 'none',
            background: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'concept' ? '#1D4ED8' : '#64748B',
            borderBottom: '2px solid transparent'
          }}
        >
          <BookOpen size={14} />
          <span>Core Concept</span>
        </button>
        <button 
          className={`card-tab-btn prep-tab ${activeTab === 'prep' ? 'active' : ''}`}
          onClick={() => setActiveTab('prep')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.85rem 1rem',
            border: 'none',
            background: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'prep' ? '#6D28D9' : '#64748B',
            borderBottom: '2px solid transparent'
          }}
        >
          <GraduationCap size={14} />
          <span>Interview Prep</span>
        </button>
        <button 
          className={`card-tab-btn explain-tab ${activeTab === 'explain' ? 'active' : ''}`}
          onClick={() => setActiveTab('explain')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.85rem 1rem',
            border: 'none',
            background: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'explain' ? '#EA580C' : '#64748B',
            borderBottom: '2px solid transparent'
          }}
        >
          <Brain size={14} />
          <span>How to Explain</span>
        </button>
        {hasAiChat && (
          <button 
            className={`card-tab-btn chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.85rem 1rem',
              border: 'none',
              background: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'chat' ? '#15803D' : '#64748B',
              borderBottom: '2px solid transparent'
            }}
          >
            <MessageSquareText size={14} />
            <span>AI Chat</span>
          </button>
        )}
        {/* Ask AI: always available */}
        <button 
          className={`card-tab-btn askai-tab ${activeTab === 'askai' ? 'active' : ''}`}
          onClick={() => setActiveTab('askai')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.85rem 1rem',
            border: 'none',
            background: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'askai' ? '#7C3AED' : '#64748B',
            borderBottom: activeTab === 'askai' ? '2px solid #7C3AED' : '2px solid transparent',
            position: 'relative',
          }}
        >
          <Bot size={14} />
          <span>Ask AI</span>
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '2px',
            width: '6px',
            height: '6px',
            background: '#7C3AED',
            borderRadius: '50%',
          }} />
        </button>
      </div>


      {/* Card Body */}
      <div className="card-body" style={{ padding: '1.5rem', background: '#FFFFFF' }}>
        
        {/* Tab 1: Core Concept */}
        <div className="tab-content-concept" style={{ display: activeTab === 'concept' ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Definition block: bulb style */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <div style={{ background: '#DBEAFE', padding: '0.5rem', borderRadius: '8px', color: '#1D4ED8', display: 'flex', alignItems: 'center' }}>
              <Lightbulb size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>Definition</strong>
              <div className="markdown-prose" style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#0F172A' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{preprocessMarkdown(card.definition)}</ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Complexity analysis side-by-side mini cards */}
          {(card.complexity_time || card.complexity_space) && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {card.complexity_time && (
                <div style={{
                  flex: 1,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.15rem' }}>Time Complexity</span>
                  <code style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1D4ED8', fontFamily: 'var(--font-mono)' }}>{card.complexity_time}</code>
                </div>
              )}
              {card.complexity_space && (
                <div style={{
                  flex: 1,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.15rem' }}>Space Complexity</span>
                  <code style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1D4ED8', fontFamily: 'var(--font-mono)' }}>{card.complexity_space}</code>
                </div>
              )}
            </div>
          )}

          {/* Mental Model Box */}
          {card.mental_model && (
            <div style={{
              background: '#F0FDF4',
              border: '1px solid #DCFCE7',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <div style={{ background: '#DCFCE7', padding: '0.5rem', borderRadius: '8px', color: '#15803D', display: 'flex', alignItems: 'center' }}>
                <Brain size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#16A34A', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>🧠 Mental Model</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#14532D' }}>{card.mental_model}</p>
              </div>
            </div>
          )}

          {/* Key Trick Box */}
          {card.key_trick && (
            <div style={{
              background: '#FFFBEB',
              border: '1px solid #FEF3C7',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <div style={{ background: '#FEF3C7', padding: '0.5rem', borderRadius: '8px', color: '#D97706', display: 'flex', alignItems: 'center' }}>
                <Zap size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#D97706', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>⚡ Key Trick</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#78350F' }}>{card.key_trick}</p>
              </div>
            </div>
          )}

          {/* Remember This Box */}
          {card.remember_this && (
            <div style={{
              background: '#FFF5F5',
              border: '1px solid #FEE2E2',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <div style={{ background: '#FEE2E2', padding: '0.5rem', borderRadius: '8px', color: '#DC2626', display: 'flex', alignItems: 'center' }}>
                <Star size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.85rem', color: '#DC2626', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>⭐ Remember This</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.6', color: '#7F1D1D' }}>{card.remember_this}</p>
              </div>
            </div>
          )}

          {/* How It Works Detail */}
          {card.how_it_works && (
            <div className="card-section-block" style={{ marginTop: '0.5rem' }}>
              <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Details / Mechanics</span>
              <div className="markdown-prose" style={{ fontSize: '0.95rem', lineHeight: '1.7', color: '#334155' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{preprocessMarkdown(card.how_it_works)}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Tab 2: Interview Prep */}
        <div className="tab-content-prep" style={{ display: activeTab === 'prep' ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Use Cases */}
          {card.use_cases && card.use_cases.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Real-World Use Cases</span>
              <div className="use-cases-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {card.use_cases.map((uc, i) => (
                  <span key={i} className="use-case-tag" style={{
                    background: '#EDE9FE',
                    color: '#6D28D9',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    border: '1px solid #DDD6FE'
                  }}>{uc}</span>
                ))}
              </div>
            </div>
          )}

          {/* Interview Questions */}
          {card.interview_questions && card.interview_questions.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Interview Questions (Active Recall)</span>
              <div className="interview-q-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {card.interview_questions.map((item, i) => (
                  <div
                    key={i}
                    className="interview-q-item"
                    style={{ 
                      transition: 'all 0.2s ease',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '0.75rem 1rem',
                      background: '#FFFFFF',
                      overflow: 'hidden',
                      height: 'auto',
                    }}
                  >
                    <div
                      onClick={() => toggleQ(i)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <p className="interview-question" style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#0F172A', flex: 1, paddingRight: '0.5rem' }}>Q: {item.question}</p>
                      {openQs[i] ? <ChevronUp size={16} color="#64748B" style={{ flexShrink: 0 }} /> : <ChevronDown size={16} color="#64748B" style={{ flexShrink: 0 }} />}
                    </div>
                    {openQs[i] ? (
                      <div
                        className="interview-answer markdown-prose"
                        style={{
                          marginTop: '0.75rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px dashed #E2E8F0',
                          fontSize: '0.9rem',
                          color: '#334155',
                          lineHeight: '1.6',
                          maxHeight: 'none',
                          overflow: 'visible',
                          width: '100%',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{preprocessMarkdown(item.answer)}</ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', margin: '0.35rem 0 0 0' }}>Click to reveal answer...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab 3: How to Explain in Interview */}
        <div className="tab-content-explain" style={{ display: activeTab === 'explain' ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>
          {card.how_to_explain ? (
            <div className="card-section-block">
              <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>How to explain this in an interview</span>
              <div className="markdown-prose" style={{ fontSize: '0.92rem', lineHeight: '1.6', color: '#334155' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{preprocessMarkdown(card.how_to_explain)}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.9rem' }}>
              No interview explanation guide available for this card.
            </div>
          )}


        </div>

        {/* Tab 4: AI Chat (conditional) */}
        {hasAiChat && (
          <div className="tab-content-chat" style={{ display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>
            {card.chat_url && (
              <div className="card-section-block" style={{ marginBottom: '-0.25rem' }}>
                <a 
                  href={card.chat_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #BBF7D0',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#BBF7D0';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#DCFCE7';
                  }}
                >
                  <ExternalLink size={14} />
                  <span>View Original AI Chat Thread</span>
                </a>
              </div>
            )}
            {/* Summary Section */}
            {card.ai_chat_summary && (
              <div className="card-section-block">
                <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Key Learnings Summary</span>
                <div className="ai-chat-summary-block" style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {card.ai_chat_summary.split('\n').filter(line => line.trim()).map((line, i) => {
                    const cleanLine = line.trim().startsWith('•') ? line.trim().substring(1).trim() : line.trim();
                    return (
                      <p key={i} className="ai-summary-bullet" style={{ margin: 0, fontSize: '0.88rem', color: '#16537E', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                        <span style={{ color: '#16A34A' }}>•</span>
                        <span style={{ color: '#14532D' }}>{cleanLine}</span>
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Curated Chat Detail */}
            {card.ai_chat_detail && (
              <div className="card-section-block">
                <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Curated Conversation</span>
                <div className="ai-chat-conversation" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {card.ai_chat_detail.split(/\n\n+/).filter(block => block.trim()).map((block, i) => {
                    const trimmed = block.trim();
                    const isQuestion = trimmed.startsWith('Q:');
                    const isAnswer = trimmed.startsWith('A:');
                    const content = isQuestion ? trimmed.slice(2).trim() : isAnswer ? trimmed.slice(2).trim() : trimmed;
                    
                    return (
                      <div 
                        key={i} 
                        className={`chat-message ${isQuestion ? 'chat-msg-user' : 'chat-msg-ai'}`}
                        style={{
                          background: isQuestion ? '#F8FAFC' : '#F0FDF4',
                          border: '1px solid ' + (isQuestion ? '#E2E8F0' : '#DCFCE7'),
                          borderRadius: '12px',
                          padding: '0.75rem 1rem'
                        }}
                      >
                        <span className="chat-msg-label" style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: isQuestion ? '#64748B' : '#15803D',
                          display: 'block',
                          marginBottom: '0.25rem'
                        }}>{isQuestion ? 'You' : 'AI'}</span>
                        <div className="chat-msg-content markdown-prose" style={{
                          fontSize: '0.9rem',
                          color: isQuestion ? '#0F172A' : '#14532D',
                          lineHeight: '1.6'
                        }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{preprocessMarkdown(content)}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Ask AI (in-card contextual chat) */}
        {activeTab === 'askai' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '420px', position: 'relative' }}>
            {/* Toast notification */}
            {saveToast && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                zIndex: 99,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}>
                {saveToast}
              </div>
            )}

            {/* Message List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              {chatMessages.length === 0 && !isChatLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', color: '#94A3B8', paddingTop: '3rem' }}>
                  <Bot size={32} style={{ opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748B' }}>Ask anything about <span style={{ color: '#7C3AED' }}>{card.title}</span></p>
                  <p style={{ margin: 0, fontSize: '0.78rem', textAlign: 'center', maxWidth: '280px', lineHeight: '1.5' }}>Code examples, deeper explanations, edge cases, or anything related to this concept.</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.25rem' }}>
                  <div style={{
                    maxWidth: '88%',
                    background: msg.role === 'user' ? '#2563EB' : '#F8F5FF',
                    border: msg.role === 'user' ? 'none' : '1px solid #EDE9FE',
                    color: msg.role === 'user' ? '#FFFFFF' : '#0F172A',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                    padding: '0.65rem 0.9rem',
                    fontSize: '0.88rem',
                    lineHeight: '1.6',
                  }}>
                    {msg.role === 'model' ? (
                      <div className="markdown-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{preprocessMarkdown(msg.text)}</ReactMarkdown>
                      </div>
                    ) : (
                      <span>{msg.text}</span>
                    )}
                  </div>
                  {/* Save to Card button for AI responses */}
                  {msg.role === 'model' && (
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setSaveMenu(prev => prev.messageIndex === i && prev.open ? { messageIndex: -1, open: false } : { messageIndex: i, open: true })}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: '1px solid #EDE9FE', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#7C3AED', cursor: 'pointer', fontWeight: 600 }}
                      >
                        <Pin size={11} />
                        Save to Card
                      </button>
                      {saveMenu.messageIndex === i && saveMenu.open && (
                        <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 4px)', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '210px', overflow: 'hidden' }}>
                          <button onClick={() => saveSnippetToCard(msg.text, 'details')} style={{ display: 'block', width: '100%', padding: '0.65rem 1rem', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #F1F5F9', fontSize: '0.82rem', cursor: 'pointer', color: '#0F172A' }}>
                            📝 Append to Details / Mechanics
                          </button>
                          <button onClick={() => saveSnippetToCard(msg.text, 'qa')} style={{ display: 'block', width: '100%', padding: '0.65rem 1rem', textAlign: 'left', background: 'none', border: 'none', fontSize: '0.82rem', cursor: 'pointer', color: '#0F172A' }}>
                            ❓ Add as Interview Q&amp;A
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7C3AED', fontSize: '0.82rem', paddingLeft: '0.25rem' }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Thinking...</span>
                </div>
              )}
              {chatError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.82rem', color: '#DC2626' }}>
                  {chatError}
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{ borderTop: '1px solid #F1F5F9', padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#FAFBFF' }}>
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                placeholder={`Ask about ${card.title}...`}
                disabled={isChatLoading}
                style={{ flex: 1, border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0.55rem 0.9rem', fontSize: '0.88rem', outline: 'none', background: '#FFFFFF', color: '#0F172A', fontFamily: 'var(--font-sans)' }}
              />
              <button
                onClick={sendChatMessage}
                disabled={!chatInput.trim() || isChatLoading}
                style={{ background: chatInput.trim() && !isChatLoading ? '#7C3AED' : '#E2E8F0', color: chatInput.trim() && !isChatLoading ? '#FFFFFF' : '#94A3B8', border: 'none', borderRadius: '10px', padding: '0.55rem 0.85rem', cursor: chatInput.trim() && !isChatLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
              >
                {isChatLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Card Footer with Spaced Repetition status & mastery toggle */}
      <div className="card-footer" style={{ 
        padding: '1rem 1.5rem', 
        background: '#F8FAFC', 
        borderTop: '1px solid #F1F5F9',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        
        {/* Progress: 5 repetition circles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            🔄 Repetitions ({(card.repetition_count || 0)})
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            {Array.from({ length: 5 }).map((_, idx) => {
              const isFilled = idx < (card.repetition_count || 0);
              return (
                <span 
                  key={idx} 
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    border: '1px solid ' + (isFilled ? '#2563EB' : '#CBD5E1'),
                    backgroundColor: isFilled ? '#2563EB' : 'transparent',
                    display: 'inline-block',
                    transition: 'all 0.2s ease'
                  }}
                  title={`Repetition ${idx + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* Revision Date */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={12} />
            <span>{getLastRevisedText()}</span>
          </div>
        </div>

        {/* Mark revised button */}
        <button 
          className="btn-revise-mark" 
          onClick={handleMarkRevised}
          style={{
            background: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)'
          }}
        >
          <CheckCircle size={14} />
          Mark Revised
        </button>
      </div>
    </div>
  );
}
