/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\components\RevisionCard.tsx */
'use client';

import React, { useState } from 'react';
import { Trash2, Share2, CheckCircle, Calendar, Sparkles, BookOpen, GraduationCap, AlertTriangle, MessageSquareText, ChevronDown, ChevronUp } from 'lucide-react';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RevisionCardData, markRevised } from '../utils/storage';

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

  const handleMarkRevised = () => {
    setIsRevisedAnimating(true);
    markRevised(card.id);
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

      // Create a temporary container to style the card nicely with a glowing gradient border
      // this mimics a premium "Ray.so" screenshot tool which is extremely viral-worthy!
      const outerWrapper = document.createElement('div');
      outerWrapper.style.padding = '40px';
      outerWrapper.style.width = `${cardElement.offsetWidth + 80}px`;
      outerWrapper.style.background = 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%)';
      outerWrapper.style.backgroundImage = 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 60%), radial-gradient(circle at 10% 10%, rgba(219, 39, 119, 0.04) 0%, transparent 40%)';
      outerWrapper.style.display = 'flex';
      outerWrapper.style.justifyContent = 'center';
      outerWrapper.style.alignItems = 'center';
      outerWrapper.style.position = 'absolute';
      outerWrapper.style.left = '-9999px';
      outerWrapper.style.top = '-9999px';
      document.body.appendChild(outerWrapper);

      // Clone card element
      const clonedCard = cardElement.cloneNode(true) as HTMLElement;
      clonedCard.style.width = `${cardElement.offsetWidth}px`;
      clonedCard.style.margin = '0';
      clonedCard.style.boxShadow = '0 20px 50px rgba(0,0,0,0.1), 0 0 30px rgba(99, 102, 241, 0.05)';
      clonedCard.style.border = '1px solid var(--border-glass)';

      // Force display of ALL tabs in the exported image so the screenshot is fully informative!
      const cloneConcept = clonedCard.querySelector('.tab-content-concept') as HTMLElement;
      const clonePrep = clonedCard.querySelector('.tab-content-prep') as HTMLElement;
      const clonePitfalls = clonedCard.querySelector('.tab-content-pitfalls') as HTMLElement;
      if (cloneConcept) cloneConcept.style.display = 'flex';
      if (clonePrep) clonePrep.style.display = 'flex';
      if (clonePitfalls) clonePitfalls.style.display = 'flex';

      // Remove the tab buttons bar from the screenshot clone
      const cloneTabs = clonedCard.querySelector('.card-tabs');
      if (cloneTabs) cloneTabs.remove();

      // Remove export/delete/revise UI elements from the clone
      const cloneActions = clonedCard.querySelector('.card-actions-top');
      if (cloneActions) cloneActions.remove();
      const cloneFooter = clonedCard.querySelector('.card-footer');
      if (cloneFooter) cloneFooter.remove();

      outerWrapper.appendChild(clonedCard);

      const canvas = await html2canvas(outerWrapper, {
        backgroundColor: null, // transparent to let CSS gradients render
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Cleanup
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

  const getRevisionStatus = () => {
    if (!card.last_revised_at) return { text: 'Not revised yet', isDue: true };
    
    const lastDate = new Date(card.last_revised_at);
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

  const status = getRevisionStatus();

  return (
    <div 
      className={`glass-panel card-outer ${isRevisedAnimating ? 'revised-glow-animation' : ''}`} 
      id={`card-capture-${card.id}`}
    >
      <style jsx global>{`
        @keyframes revised-glow {
          0% { box-shadow: var(--shadow-glass); border-color: var(--border-glass); }
          50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.4); border-color: var(--accent-success); transform: scale(1.01); }
          100% { box-shadow: var(--shadow-glass); border-color: var(--border-glass); }
        }
        .revised-glow-animation {
          animation: revised-glow 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
      `}</style>

      {/* Card Header */}
      <div className="card-header-bar">
        <div className="card-title-group">
          <span className="card-tag">Revision Card</span>
          <h2 className="card-title">{card.title}</h2>
        </div>
        <div className="card-actions-top">
          <button 
            className="icon-btn" 
            onClick={handleExport} 
            title="Export card as beautiful image"
            disabled={isExporting}
          >
            <Share2 size={16} style={{ color: isExporting ? 'var(--text-muted)' : 'var(--accent-cyan)' }} />
          </button>
          <button 
            className="icon-btn delete" 
            onClick={() => onDelete(card.id)} 
            title="Delete card"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 🧭 Segmented tabs inside card */}
      <div className="card-tabs">
        <button 
          className={`card-tab-btn ${activeTab === 'concept' ? 'active' : ''}`}
          onClick={() => setActiveTab('concept')}
        >
          <BookOpen size={14} />
          <span>Core Concept</span>
        </button>
        <button 
          className={`card-tab-btn ${activeTab === 'prep' ? 'active' : ''}`}
          onClick={() => setActiveTab('prep')}
        >
          <GraduationCap size={14} />
          <span>Interview Prep</span>
        </button>
        <button 
          className={`card-tab-btn ${activeTab === 'pitfalls' ? 'active' : ''}`}
          onClick={() => setActiveTab('pitfalls')}
        >
          <AlertTriangle size={14} />
          <span>Pitfalls</span>
        </button>
        {hasAiChat && (
          <button 
            className={`card-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquareText size={14} />
            <span>AI Chat</span>
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className="card-body">
        
        {/* Tab 1: Core Concept */}
        <div className="tab-content-concept" style={{ display: activeTab === 'concept' ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Definition */}
          <div className="card-section-block">
            <span className="card-section-title">Definition</span>
            <div className="card-definition markdown-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{card.definition}</ReactMarkdown>
            </div>
          </div>

          {/* How It Works (Code) */}
          {card.how_it_works && (
            <div className="card-section-block">
              <span className="card-section-title">Details / How It Works</span>
              <div className="markdown-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{card.how_it_works}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Tab 2: Interview Prep */}
        <div className="tab-content-prep" style={{ display: activeTab === 'prep' ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Use Cases */}
          {card.use_cases && card.use_cases.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title">Use Cases</span>
              <div className="use-cases-grid">
                {card.use_cases.map((uc, i) => (
                  <span key={i} className="use-case-tag">{uc}</span>
                ))}
              </div>
            </div>
          )}

          {/* Interview Questions */}
          {card.interview_questions && card.interview_questions.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title">Interview Questions (Active Recall)</span>
              <div className="interview-q-list">
                {card.interview_questions.map((item, i) => (
                  <div key={i} className="interview-q-item" onClick={() => toggleQ(i)} style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p className="interview-question">Q: {item.question}</p>
                      {openQs[i] ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                    </div>
                    {openQs[i] ? (
                      <div className="interview-answer markdown-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{item.answer}</ReactMarkdown>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>Click to reveal answer...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab 3: Pitfalls & Related */}
        <div className="tab-content-pitfalls" style={{ display: activeTab === 'pitfalls' ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Common Mistakes */}
          {card.common_mistakes && card.common_mistakes.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title">Common Mistakes (Avoid in Interviews)</span>
              <ul className="mistakes-list">
                {card.common_mistakes.map((mistake, i) => (
                  <li key={i} className="mistake-item">{mistake}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Concepts */}
          {card.related_concepts && card.related_concepts.length > 0 && (
            <div className="card-section-block">
              <span className="card-section-title">Related Concepts</span>
              <div className="related-concepts-row">
                {card.related_concepts.map((concept, i) => (
                  <span key={i} className="concept-chip">{concept}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab 4: AI Chat (conditional) */}
        {hasAiChat && (
          <div className="tab-content-chat" style={{ display: activeTab === 'chat' ? 'flex' : 'none', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Summary Section */}
            {card.ai_chat_summary && (
              <div className="card-section-block">
                <span className="card-section-title">Key Learnings Summary</span>
                <div className="ai-chat-summary-block">
                  {card.ai_chat_summary.split('\n').filter(line => line.trim()).map((line, i) => (
                    <p key={i} className="ai-summary-bullet">{line.trim()}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Curated Chat Detail */}
            {card.ai_chat_detail && (
              <div className="card-section-block">
                <span className="card-section-title">Curated Conversation</span>
                <div className="ai-chat-conversation">
                  {card.ai_chat_detail.split(/\n\n+/).filter(block => block.trim()).map((block, i) => {
                    const trimmed = block.trim();
                    const isQuestion = trimmed.startsWith('Q:');
                    const isAnswer = trimmed.startsWith('A:');
                    const content = isQuestion ? trimmed.slice(2).trim() : isAnswer ? trimmed.slice(2).trim() : trimmed;
                    
                    return (
                      <div 
                        key={i} 
                        className={`chat-message ${isQuestion ? 'chat-msg-user' : 'chat-msg-ai'}`}
                      >
                        <span className="chat-msg-label">{isQuestion ? 'You' : 'AI'}</span>
                        <div className="chat-msg-content markdown-prose">
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

      {/* Card Footer */}
      <div className="card-footer">
        <div className={`revise-indicator ${status.isDue ? 'due' : ''}`}>
          <Calendar size={14} style={{ marginRight: '4px' }} />
          <span>{status.text}</span>
          {status.isDue && (
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', marginLeft: '6px' }}>
              <Sparkles size={10} style={{ marginRight: '2px' }} /> Needs review
            </span>
          )}
        </div>
        <button className="btn-revise-mark" onClick={handleMarkRevised}>
          <CheckCircle size={12} style={{ marginRight: '4px', display: 'inline', verticalAlign: 'middle' }} />
          Mark Revised
        </button>
      </div>
    </div>
  );
}
