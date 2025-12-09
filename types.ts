export interface BugReport {
  bug_summary: string;
  user_sentiment: string;
  file_to_edit: string;
  explanation: string;
  code_patch: string;
}

export interface ChatEntry {
  role: 'user' | 'model';
  content: string | BugReport;
  timestamp: number;
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  history: ChatEntry[];
  latestReport: BugReport | null;
}

export enum Step {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS'
}