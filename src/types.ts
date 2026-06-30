export type Priority = "Critical" | "Soon" | "Okay";
export type UserRole = "Student" | "Professional";

export interface Subtask {
  id: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: string;
  priority: Priority;
  completed: boolean;
  role: UserRole;
  subtasks: Subtask[];
  createdAt: string;
}

export interface Nudge {
  title: string;
  content: string;
  actionLabel: string;
  type: "warning" | "tip" | "info";
}

export interface DailyPlan {
  rankedTaskIds: string[];
  dailyPlanSummary: string;
  coreFocus: string;
}

export interface OverloadSuggestion {
  taskId: string;
  action: string;
  justification: string;
}

export interface OverloadStatus {
  isOverloaded: boolean;
  alertMessage: string;
  suggestions: OverloadSuggestion[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AutoDraft {
  subject: string;
  body: string;
}
