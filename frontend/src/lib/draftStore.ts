export interface Draft {
  id: string;
  pairId: string;
  body: string;
  savedAt: number;
}

const DRAFT_PREFIX = 'setu_draft_';

export function saveDraft(pairId: string, body: string): Draft {
  const id = `${Date.now()}`;
  const draft: Draft = {
    id,
    pairId,
    body,
    savedAt: Date.now(),
  };
  
  const key = `${DRAFT_PREFIX}${pairId}`;
  localStorage.setItem(key, JSON.stringify(draft));
  
  return draft;
}

export function getDraft(pairId: string): Draft | null {
  const key = `${DRAFT_PREFIX}${pairId}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function deleteDraft(pairId: string): void {
  const key = `${DRAFT_PREFIX}${pairId}`;
  localStorage.removeItem(key);
}

export function getAllDrafts(): Draft[] {
  const drafts: Draft[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(DRAFT_PREFIX)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          drafts.push(JSON.parse(stored));
        } catch {
          // Skip corrupted drafts
        }
      }
    }
  }
  
  return drafts;
}
