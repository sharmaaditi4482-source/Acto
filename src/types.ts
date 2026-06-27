export interface Deadline {
  id: string;
  title: string;
  description: string;
  dueAt: string; // ISO string
  source: 'calendar' | 'gmail' | 'tasks' | 'manual';
  sourceName?: string;
  urgencyScore: number; // 0-100
  status: 'pending' | 'active' | 'done' | 'missed' | 'recovering' | 'recovered';
  contactName?: string;
  contactEmail?: string;
  category: 'work' | 'study' | 'personal' | 'finance';
}

export interface AgentAction {
  id: string;
  deadlineId: string;
  type: 'send_email' | 'reschedule_event' | 'extension_request' | 'send_whatsapp';
  status: 'pending' | 'awaiting_approval' | 'approved' | 'executing' | 'executed' | 'failed';
  draftTo?: string;
  draftSubject?: string;
  draftBody?: string;
  agentReasoning: string;
  agentConfidence: number; // 0-100
  chainOfThought: string[];
  executedAt?: string;
}

export interface RecoveryPlan {
  id: string;
  deadlineId: string;
  status: 'active' | 'completed' | 'dismissed';
  steps: {
    id: string;
    order: number;
    title: string;
    description: string;
    status: 'pending' | 'completed';
    actionType: 'send_email' | 'reschedule_event' | 'extension_request';
    draftSubject?: string;
    draftBody?: string;
    draftTo?: string;
  }[];
  createdAt: string;
}

export interface ConnectedAccount {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  email?: string;
}

export interface UserPreferences {
  name: string;
  email: string;
  aiTone: 'formal' | 'balanced' | 'casual';
  voiceActive: boolean;
}
