/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\components\RevisionCard.tsx */
'use client';

import React, { useState } from 'react';
import { Trash2, Share2, CheckCircle, Calendar, Sparkles, BookOpen, GraduationCap, AlertTriangle, MessageSquareText, ChevronDown, ChevronUp, Brain, Star, Zap, Lightbulb, ExternalLink } from 'lucide-react';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RevisionCardData, markRevised, updateMasteryLevel } from '../utils/storage';

interface RevisionCardProps {
  card: RevisionCardData;
  onDelete: (id: string) => void;
  onRevise: () => void;
}

export default function RevisionCard({ card, onDelete, onRevise }: RevisionCardProps) {
  const [activeTab, setActiveTab] = useState<'concept' | 'prep' | 'pitfalls' | 'chat'>('concept');
  const hasAiChat = !!(card.ai_chat_summary || card.ai_chat_detail);
  const [isExporting, setIsExporting] = useState(false);
  const [isRevisedAnimating, setIsRevisedAnimating] = useState(false);
  const [mastery, setMastery] = useState<'new' | 'learning' | 'mastered'>(card.mastery_level || 'new');

  const [openQs, setOpenQs] = useState<Record<number, boolean>>({});

  const toggleQ = (index: number) => {
    setOpenQs(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleMasteryChange = async (newMastery: 'new' | 'learning' | 'mastered') => {
    setMastery(newMastery);
    await updateMasteryLevel(card.id, newMastery);
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
      const clonePitfalls = clonedCard.querySelector('.tab-content-pitfalls') as HTMLElement;
      if (cloneConcept) cloneConcept.style.display = 'flex';
      if (clonePrep) clonePrep.style.display = 'flex';
      if (clonePitfalls) clonePitfalls.style.display = 'flex';

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

  const getRevisionSchedule = () => {
    let nextReview = 'Today';
    if (mastery === 'learning') nextReview = 'Tomorrow';
    if (mastery === 'mastered') nextReview = 'In 4 days';

    if (!card.last_revised_at) {
      return { lastText: 'Never revised', nextText: nextReview };
    }
    
    const lastDate = new Date(card.last_revised_at);
    const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let lastText = 'Revised today';
    if (diffDays === 1) lastText = 'Revised yesterday';
    if (diffDays > 1) lastText = `Revised ${diffDays} days ago`;

    return { lastText, nextText: nextReview };
  };

  const schedule = getRevisionSchedule();


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
        overflow: 'hidden'
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
      <div className="card-header-bar" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F1F5F9', background: '#FFFFFF' }}>
        <div className="card-title-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
          className={`card-tab-btn pitfalls-tab ${activeTab === 'pitfalls' ? 'active' : ''}`}
          onClick={() => setActiveTab('pitfalls')}
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
            color: activeTab === 'pitfalls' ? '#DC2626' : '#64748B',
            borderBottom: '2px solid transparent'
          }}
        >
          <AlertTriangle size={14} />
          <span>Pitfalls</span>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{card.definition}</ReactMarkdown>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{card.how_it_works}</ReactMarkdown>
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
                  <div key={i} className="interview-q-item" onClick={() => toggleQ(i)} style={{ 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    background: '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p className="interview-question" style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#0F172A' }}>Q: {item.question}</p>
                      {openQs[i] ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                    </div>
                    {openQs[i] ? (
                      <div className="interview-answer markdown-prose" style={{
                        marginTop: '0.75rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px dashed #E2E8F0',
                        fontSize: '0.9rem',
                        color: '#334155',
                        lineHeight: '1.6'
                      }} onClick={(e) => e.stopPropagation()}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{item.answer}</ReactMarkdown>
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

        {/* Tab 3: Pitfalls & Related */}
        <div className="tab-content-pitfalls" style={{ display: activeTab === 'pitfalls' ? 'flex' : 'none', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Common Mistakes */}
          {card.common_mistakes && card.common_mistakes.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Common Mistakes to Avoid</span>
              <ul className="mistakes-list" style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {card.common_mistakes.map((mistake, i) => (
                  <li key={i} className="mistake-item" style={{ color: '#E11D48', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    <span style={{ color: '#334155' }}>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Concepts */}
          {card.related_concepts && card.related_concepts.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title" style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Related Concepts</span>
              <div className="related-concepts-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {card.related_concepts.map((concept, i) => (
                  <span key={i} className="concept-chip" style={{
                    background: '#F1F5F9',
                    color: '#475569',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid #E2E8F0'
                  }}>{concept}</span>
                ))}
              </div>
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
        
        {/* Progress psychology: New, Learning, Mastered */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            🔥 Revision Status
          </span>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {(['new', 'learning', 'mastered'] as const).map((level) => {
              const isActive = mastery === level;
              const levelLabels = { new: '○ New', learning: '◐ Learning', mastered: '● Mastered' };
              const activeStyles = {
                new: { bg: '#E2E8F0', text: '#475569' },
                learning: { bg: '#FEF3C7', text: '#D97706' },
                mastered: { bg: '#DCFCE7', text: '#15803D' }
              };

              return (
                <button
                  key={level}
                  onClick={() => handleMasteryChange(level)}
                  style={{
                    background: isActive ? activeStyles[level].bg : '#FFFFFF',
                    color: isActive ? activeStyles[level].text : '#64748B',
                    border: '1px solid ' + (isActive ? 'transparent' : '#E2E8F0'),
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {levelLabels[level]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Spaced Repetition Dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={12} />
            <span>{schedule.lastText}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Sparkles size={12} />
            <span>Next review: {schedule.nextText}</span>
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
