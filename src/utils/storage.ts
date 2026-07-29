/* C:\Users\HP\.gemini\antigravity\scratch\tech-knowledge-vault\src\utils\storage.ts */
import { supabase } from './supabaseClient';

export interface RevisionCardData {
  id: string;
  title: string;
  definition: string;
  how_it_works: string;
  use_cases: string[];
  interview_questions: { question: string; answer: string }[];
  common_mistakes: string[];
  related_concepts: string[];
  last_revised_at: string | null;
  created_at: string;
  ai_chat_summary?: string;
  ai_chat_detail?: string;
  
  // New fields:
  mental_model?: string;
  remember_this?: string;
  key_trick?: string;
  complexity_time?: string;
  complexity_space?: string;
  tags?: string[];
  difficulty?: string;
  mastery_level?: 'new' | 'learning' | 'mastered';
  chat_url?: string;
}

export interface UserStreak {
  count: number;
  lastRevisedDate: string | null; // format: YYYY-MM-DD
}

const CARDS_KEY = 'tkv_revision_cards';
const STREAK_KEY = 'tkv_revision_streak';

const CS_QUOTES = [
  { text: "Spaced repetition is the caching layer of human memory. Don't let your brain's cache expire.", author: "Memory Compiler" },
  { text: "Code written once and forgotten is like a function that is never called. Execute your revision routine.", author: "Retention Dev" },
  { text: "Streaks are like Git commits — keep the green squares active in your brain.", author: "Commit to Memory" },
  { text: "Learning is the write operation, revision is the index that makes lookup O(1).", author: "Data Structure Wisdom" },
  { text: "Consistency beats intensity. 5 minutes of active recall today prevents hours of re-learning tomorrow.", author: "Senior Architect" },
  { text: "Your brain is a neural network. It requires backpropagation (revision) to adjust weights and retain patterns.", author: "AI Optimizer" },
  { text: "The difference between a junior and a senior is not what they can search, but what they can retrieve instantly during a design choice.", author: "Tech Lead" }
];

// Helper to get raw local data (synchronously for internal functions)
const getLocalCardsOnly = (): RevisionCardData[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(CARDS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

const getLocalStreakOnly = (): UserStreak => {
  if (typeof window === 'undefined') return { count: 0, lastRevisedDate: null };
  const stored = localStorage.getItem(STREAK_KEY);
  if (!stored) return { count: 0, lastRevisedDate: null };
  try {
    return JSON.parse(stored);
  } catch (e) {
    return { count: 0, lastRevisedDate: null };
  }
};

// ==========================================================================
// ASYNC API METHODS (CLOUD SYNC + LOCAL FALLBACK)
// ==========================================================================

const parseSyncedCard = (c: any): RevisionCardData => {
  let meta: any = {};
  let summary = c.ai_chat_summary || '';
  if (summary.trim().startsWith('{')) {
    try {
      meta = JSON.parse(summary);
      summary = meta.summary || '';
    } catch(e) {}
  }
  return {
    id: c.id,
    title: c.title,
    definition: c.definition,
    how_it_works: c.how_it_works || '',
    use_cases: c.use_cases || [],
    interview_questions: c.interview_questions || [],
    common_mistakes: c.common_mistakes || [],
    related_concepts: c.related_concepts || [],
    last_revised_at: c.last_revised_at,
    created_at: c.created_at,
    ai_chat_summary: summary || undefined,
    ai_chat_detail: c.ai_chat_detail || undefined,
    
    mental_model: meta.mental_model || c.mental_model || undefined,
    remember_this: meta.remember_this || c.remember_this || undefined,
    key_trick: meta.key_trick || c.key_trick || undefined,
    complexity_time: meta.complexity_time || c.complexity_time || undefined,
    complexity_space: meta.complexity_space || c.complexity_space || undefined,
    tags: meta.tags || c.tags || undefined,
    difficulty: meta.difficulty || c.difficulty || undefined,
    mastery_level: meta.mastery_level || c.mastery_level || 'new',
    chat_url: meta.chat_url || c.chat_url || undefined
  };
};

export const getCards = async (): Promise<RevisionCardData[]> => {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((c: any) => parseSyncedCard(c));
      }
    }
  }
  return getLocalCardsOnly().map(c => ({
    ...c,
    mastery_level: c.mastery_level || 'new'
  }));
};

export const saveCard = async (card: Omit<RevisionCardData, 'id' | 'created_at' | 'last_revised_at'>): Promise<RevisionCardData> => {
  const metaPayload = {
    summary: card.ai_chat_summary || '',
    mental_model: card.mental_model,
    remember_this: card.remember_this,
    key_trick: card.key_trick,
    complexity_time: card.complexity_time,
    complexity_space: card.complexity_space,
    tags: card.tags,
    difficulty: card.difficulty,
    mastery_level: card.mastery_level || 'new',
    chat_url: card.chat_url
  };

  const serializedSummary = JSON.stringify(metaPayload);

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const insertPayload: any = {
        user_id: user.id,
        title: card.title,
        definition: card.definition,
        how_it_works: card.how_it_works,
        use_cases: card.use_cases,
        interview_questions: card.interview_questions,
        common_mistakes: card.common_mistakes,
        related_concepts: card.related_concepts,
        ai_chat_summary: serializedSummary
      };
      if (card.ai_chat_detail) insertPayload.ai_chat_detail = card.ai_chat_detail;
      
      const { data, error } = await supabase
        .from('cards')
        .insert(insertPayload)
        .select()
        .single();
      
      if (!error && data) {
        return parseSyncedCard(data);
      }
    }
  }

  // Local fallback
  const cards = getLocalCardsOnly();
  const newCard: RevisionCardData = {
    ...card,
    id: Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
    last_revised_at: null,
    mastery_level: card.mastery_level || 'new'
  };
  cards.unshift(newCard);
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  return newCard;
};

export const deleteCard = async (id: string): Promise<void> => {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', id);
      if (!error) return;
    }
  }

  // Local fallback
  const cards = getLocalCardsOnly();
  const filtered = cards.filter(c => c.id !== id);
  localStorage.setItem(CARDS_KEY, JSON.stringify(filtered));
};

export const markRevised = async (id: string): Promise<{ card: RevisionCardData; streakUpdated: boolean }> => {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('cards')
        .update({ last_revised_at: now })
        .eq('id', id)
        .select()
        .single();
      
      if (!error && data) {
        const streak = await updateStreak();
        return {
          card: parseSyncedCard(data),
          streakUpdated: true
        };
      }
    }
  }

  // Local fallback
  const cards = getLocalCardsOnly();
  let streakUpdated = false;
  const updatedCards = cards.map(c => {
    if (c.id === id) {
      streakUpdated = true;
      return {
        ...c,
        last_revised_at: new Date().toISOString()
      };
    }
    return c;
  });
  
  localStorage.setItem(CARDS_KEY, JSON.stringify(updatedCards));
  if (streakUpdated) {
    await updateStreak();
  }
  
  const updatedCard = updatedCards.find(c => c.id === id)!;
  return { card: updatedCard, streakUpdated };
};

export const updateMasteryLevel = async (id: string, mastery: 'new' | 'learning' | 'mastered'): Promise<RevisionCardData> => {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: currentCard, error: fetchError } = await supabase
        .from('cards')
        .select('*')
        .eq('id', id)
        .single();

      if (!fetchError && currentCard) {
        let meta: any = {};
        let summary = currentCard.ai_chat_summary || '';
        if (summary.trim().startsWith('{')) {
          try {
            meta = JSON.parse(summary);
          } catch(e) {}
        }
        
        meta.mastery_level = mastery;
        const serialized = JSON.stringify(meta);

        const { data, error } = await supabase
          .from('cards')
          .update({ ai_chat_summary: serialized })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          return parseSyncedCard(data);
        }
      }
    }
  }

  // Local fallback
  const cards = getLocalCardsOnly();
  const updatedCards = cards.map(c => {
    if (c.id === id) {
      return {
        ...c,
        mastery_level: mastery
      };
    }
    return c;
  });
  localStorage.setItem(CARDS_KEY, JSON.stringify(updatedCards));
  return updatedCards.find(c => c.id === id)!;
};

export const getStreak = async (): Promise<UserStreak> => {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        return {
          count: data.streak || 0,
          lastRevisedDate: data.last_revised_date
        };
      }
    }
  }
  return getLocalStreakOnly();
};

export const updateStreak = async (): Promise<UserStreak> => {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      let newCount = 1;
      
      if (!error && profile) {
        if (profile.last_revised_date === todayStr) {
          return { count: profile.streak, lastRevisedDate: profile.last_revised_date };
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (profile.last_revised_date === yesterdayStr) {
          newCount = profile.streak + 1;
        }
      }

      const { data: updatedProfile } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          streak: newCount,
          last_revised_date: todayStr
        })
        .select()
        .single();

      if (updatedProfile) {
        return {
          count: updatedProfile.streak,
          lastRevisedDate: updatedProfile.last_revised_date
        };
      }
    }
  }

  // Local fallback
  const streak = getLocalStreakOnly();
  if (streak.lastRevisedDate === todayStr) {
    return streak;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  let newCount = streak.count;
  if (streak.lastRevisedDate === yesterdayStr) {
    newCount += 1;
  } else if (streak.lastRevisedDate === null || streak.lastRevisedDate < yesterdayStr) {
    newCount = 1;
  }
  
  const newStreak = {
    count: newCount,
    lastRevisedDate: todayStr
  };
  
  localStorage.setItem(STREAK_KEY, JSON.stringify(newStreak));
  return newStreak;
};

// ==========================================================================
// DATA MIGRATION ON SUCCESSFUL SIGN IN
// ==========================================================================

export const syncLocalCardsToCloud = async (): Promise<void> => {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const localCards = getLocalCardsOnly();
  if (localCards.length === 0) return;

  // 1. Upload cards
  for (const card of localCards) {
    const syncPayload: any = {
      user_id: user.id,
      title: card.title,
      definition: card.definition,
      how_it_works: card.how_it_works,
      use_cases: card.use_cases,
      interview_questions: card.interview_questions,
      common_mistakes: card.common_mistakes,
      related_concepts: card.related_concepts,
      created_at: card.created_at,
      last_revised_at: card.last_revised_at
    };
    if (card.ai_chat_summary) syncPayload.ai_chat_summary = card.ai_chat_summary;
    if (card.ai_chat_detail) syncPayload.ai_chat_detail = card.ai_chat_detail;
    await supabase.from('cards').insert(syncPayload);
  }

  // 2. Upload streak profile
  const localStreak = getLocalStreakOnly();
  if (localStreak.count > 0 && localStreak.lastRevisedDate) {
    await supabase.from('user_profiles').upsert({
      id: user.id,
      streak: localStreak.count,
      last_revised_date: localStreak.lastRevisedDate
    });
  }

  // 3. Clean local storage after successful sync
  localStorage.removeItem(CARDS_KEY);
  localStorage.removeItem(STREAK_KEY);
};

// Pick daily motivation quote
export const getDailyQuote = (): { text: string; author: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  const index = dayOfYear % CS_QUOTES.length;
  return CS_QUOTES[index]!;
};

// Client-side fallback semantic search with tokenized fuzzy matching (Levenshtein distance)
export const clientSearchCards = (query: string, cards: RevisionCardData[]): RevisionCardData[] => {
  if (!query || query.trim() === '') return cards;
  
  const cleanQuery = query.toLowerCase().trim();
  const terms = cleanQuery.split(/\s+/).filter(t => t.length > 1); // ignore single chars
  
  if (terms.length === 0) return cards;
  
  // Stop words to filter out if there are other terms
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'by', 'at', 'on', 'from', 'to', 'in', 'is', 'are', 'was', 'were', 'it', 'its']);
  const filteredTerms = terms.length > 1 ? terms.filter(t => !stopWords.has(t)) : terms;
  const searchTerms = filteredTerms.length > 0 ? filteredTerms : terms;

  return cards
    .map(card => {
      let score = 0;
      
      const titleLower = card.title.toLowerCase();
      const defLower = card.definition.toLowerCase();
      const mechanicsLower = card.how_it_works.toLowerCase();
      
      // 1. Exact phrase match has the highest priority
      if (titleLower === cleanQuery) {
        score += 500;
      } else if (titleLower.includes(cleanQuery)) {
        score += 300;
      }
      
      // 2. Token-based matching & fuzzy matching
      searchTerms.forEach(term => {
        // Substring match in Title
        if (titleLower.includes(term)) {
          const titleWords = titleLower.split(/[\s_\-\/]+/);
          if (titleWords.includes(term)) {
            score += 100; // Exact word match in title
          } else {
            score += 50;  // Substring match
          }
        }
        
        // Related concepts match
        card.related_concepts.forEach(concept => {
          const cLower = concept.toLowerCase();
          if (cLower.includes(term)) {
            score += cLower === term ? 60 : 30;
          }
        });
        
        // Use cases match
        card.use_cases.forEach(uc => {
          if (uc.toLowerCase().includes(term)) {
            score += 20;
          }
        });
        
        // Definition match
        if (defLower.includes(term)) {
          score += 15;
        }
        
        // Mechanics match
        if (mechanicsLower.includes(term)) {
          score += 10;
        }

        // Fuzzy matching: Levenshtein distance check against title words
        const titleWords = titleLower.split(/[\s_\-\/]+/);
        titleWords.forEach(word => {
          if (word.length > 3 && term.length > 3) {
            const dist = editDistance(word, term);
            if (dist <= 1) { // 1 character difference (e.g. razoray vs razorpay, gate vs guide)
              score += 80;
            } else if (dist === 2 && word.length > 5) { // 2 characters difference for longer words
              score += 40;
            }
          }
        });
      });
      
      return { card, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.card);
};

// Helper for edit distance (Levenshtein)
function editDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0]![j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1,    // deletion
          dp[i]![j - 1]! + 1,    // insertion
          dp[i - 1]![j - 1]! + 1 // substitution
        );
      }
    }
  }
  return dp[m]![n]!;
}
