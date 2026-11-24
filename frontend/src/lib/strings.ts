export const LIMITS = {
  letterMinChars: 20,
  letterMaxChars: 4000,
  returnNoteMaxChars: 500,
  lettersPerWeek: 4,
  weekMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export const STRINGS = {
  appName: 'Setu Pen Pals',
  appTagline: 'Connect with your pen pal',
  
  // Auth
  signIn: 'Sign In',
  signUp: 'Sign Up',
  email: 'Email',
  password: 'Password',
  displayName: 'Display Name',
  
  // Navigation
  mailbox: 'Mailbox',
  writeLetter: 'Write Letter',
  viewProfile: 'View Profile',
  settings: 'Settings',
  logout: 'Logout',
  
  // Letter
  letterSubmitted: 'Letter submitted for review',
  letterApproved: 'Your letter was approved!',
  letterReturned: 'Your letter was returned. See feedback below.',
  newLetter: 'New Letter',
  reply: 'Reply',
  approve: 'Approve',
  return: 'Return',
  report: 'Report',
  
  // Errors
  piiBlocked: 'Your letter contains contact information. Please remove it and try again.',
  letterTooShort: `Letters must be at least ${LIMITS.letterMinChars} characters`,
  letterTooLong: `Letters must be no more than ${LIMITS.letterMaxChars} characters`,
  weeklyLimitReached: 'You have reached your weekly letter limit. Try again next week.',
  pairPaused: 'Your pair is paused. Please contact a safety officer.',
  errorLoading: 'Failed to load data',
  errorSubmitting: 'Failed to submit letter',
  
  // States
  draft: 'Draft',
  inReview: 'In Review',
  approved: 'Approved',
  returned: 'Returned',
  active: 'Active',
  paused: 'Paused',
} as const;
