import { create } from "zustand";

export interface PipelineEvent {
  event: string;
  job_id?: string;
  clause_count?: number;
  contradictions?: number;
  historical_flags?: number;
  done?: number;
  total?: number;
  redlined_count?: number;
  pr_url?: string;
  violation_count?: number;
  duration_seconds?: number;
  error?: string;
  timestamp?: string;
}

export interface JobResult {
  job_id: string;
  status: string;
  filename: string;
  duration_seconds: number;
  summary: {
    total_clauses: number;
    violation: number;
    high: number;
    medium: number;
    low: number;
    compliant: number;
  };
  clauses: Clause[];
  contradictions: Contradiction[];
  historical_flags: HistoricalFlag[];
  github_pr_url: string;
  audit_trail: { file_hash: string; timestamp: string };
}

export interface Clause {
  clause_id: string;
  clause_type: string;
  text: string;
  risk_level: "compliant" | "low" | "medium" | "high" | "violation";
  regulation: string;
  explanation: string;
  confidence: number;
  redlined_text?: string;
  redline_explanation?: string;
  contradiction_hits: unknown[];
  historical_flags: unknown[];
}

export interface Contradiction {
  clause_a_id: string;
  clause_b_id: string;
  clause_a_text: string;
  clause_b_text: string;
  explanation: string;
  severity: string;
}

export interface HistoricalFlag {
  clause_id: string;
  text: string;
  flagged_in_job: string;
  flagged_in_project: string;
  flagged_date: string;
  original_risk_level: string;
}

export interface ConsumerAnalysis {
  summary: string[];
  unfair_clauses: {
    clause_text: string;
    explanation: string;
    fair_alternative: string;
  }[];
  obligation_map: {
    user_obligations: string[];
    company_obligations: string[];
  };
  ambiguity_flags: { term: string; explanation: string }[];
  benchmark_comparisons: { finding: string; context: string }[];
  risk_level: string;
  disclaimer: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: { job_id: string; filename: string; clause_id: string; clause_text: string; relevance_score: number }[];
}

interface AppStore {
  // Enterprise
  currentJobId: string | null;
  pipelineEvents: PipelineEvent[];
  jobResult: JobResult | null;
  isProcessing: boolean;
  setCurrentJobId: (id: string | null) => void;
  addPipelineEvent: (ev: PipelineEvent) => void;
  setJobResult: (r: JobResult | null) => void;
  setIsProcessing: (v: boolean) => void;
  resetPipeline: () => void;

  // Consumer
  consumerAnalysis: ConsumerAnalysis | null;
  consumerLoading: boolean;
  setConsumerAnalysis: (a: ConsumerAnalysis | null) => void;
  setConsumerLoading: (v: boolean) => void;

  // Chat
  chatHistory: ChatMessage[];
  addChatMessage: (m: ChatMessage) => void;
  clearChat: () => void;
}

export const useStore = create<AppStore>((set) => ({
  currentJobId: null,
  pipelineEvents: [],
  jobResult: null,
  isProcessing: false,
  setCurrentJobId: (id) => set({ currentJobId: id }),
  addPipelineEvent: (ev) =>
    set((s) => ({ pipelineEvents: [...s.pipelineEvents, ev] })),
  setJobResult: (r) => set({ jobResult: r }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  resetPipeline: () =>
    set({ currentJobId: null, pipelineEvents: [], jobResult: null, isProcessing: false }),

  consumerAnalysis: null,
  consumerLoading: false,
  setConsumerAnalysis: (a) => set({ consumerAnalysis: a }),
  setConsumerLoading: (v) => set({ consumerLoading: v }),

  chatHistory: [],
  addChatMessage: (m) =>
    set((s) => ({ chatHistory: [...s.chatHistory, m] })),
  clearChat: () => set({ chatHistory: [] }),
}));
