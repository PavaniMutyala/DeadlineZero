import React, { useState } from "react";
import { 
  Calendar, 
  CheckSquare, 
  Square, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  MessageSquare, 
  Trash2, 
  FileText,
  Clock
} from "lucide-react";
import { Task, Subtask } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface TaskCardProps {
  key?: string;
  task: Task;
  onToggleComplete: (taskId: string) => void | Promise<void>;
  onToggleSubtask: (taskId: string, subtaskId: string) => void | Promise<void>;
  onDeleteTask: (taskId: string) => void | Promise<void>;
  onAskAI: (task: Task) => void;
  onGenerateDraft: (task: Task) => void | Promise<void>;
}

const CONFETTI_COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6"];

export default function TaskCard({
  task,
  onToggleComplete,
  onToggleSubtask,
  onDeleteTask,
  onAskAI,
  onGenerateDraft
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Compute progress percentage
  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (task.completed ? 100 : 0);

  // Parse and format deadline
  const isOverdue = new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0)) && !task.completed;
  const daysRemaining = Math.ceil((new Date(task.deadline).getTime() - new Date().setHours(0,0,0,0)) / 86400000);

  // Format Google Calendar Template URL
  const getGoogleCalendarUrl = () => {
    const cleanDate = task.deadline.replace(/-/g, "");
    // Google Calendar template URL uses YYYYMMDD format
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      "[DeadlineZero] " + task.title
    )}&dates=${cleanDate}/${cleanDate}&details=${encodeURIComponent(
      task.description || "DeadlineZero Automated Task Sync"
    )}&sf=true&output=xml`;
    return url;
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
    }, 2200);
  };

  const handleToggleComplete = async () => {
    const nextCompleted = !task.completed;
    if (nextCompleted && (totalSubtasks === 0 || completedSubtasks === totalSubtasks)) {
      triggerCelebration();
    }
    await onToggleComplete(task.id);
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const sub = task.subtasks.find(s => s.id === subtaskId);
    if (sub && !sub.completed) {
      const newlyCompletedCount = completedSubtasks + 1;
      if (newlyCompletedCount === totalSubtasks) {
        triggerCelebration();
      }
    }
    await onToggleSubtask(task.id, subtaskId);
  };

  const getPriorityStyle = (p: string) => {
    switch (p) {
      case "Critical":
        return "bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-md px-2 py-0.5";
      case "Soon":
        return "bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-md px-2 py-0.5";
      default:
        return "bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-md px-2 py-0.5";
    }
  };

  const borderLColor = task.completed 
    ? "border-l-slate-300" 
    : task.priority === "Critical" 
      ? "border-l-red-500" 
      : task.priority === "Soon" 
        ? "border-l-amber-500" 
        : "border-l-emerald-500";

  // Generate deterministic particles
  const particles = Array.from({ length: 28 }).map((_, i) => {
    const angle = (i / 28) * 360 + (Math.sin(i) * 15);
    const velocity = 65 + (Math.abs(Math.cos(i)) * 75);
    const radians = (angle * Math.PI) / 180;
    const tx = Math.cos(radians) * velocity;
    const ty = Math.sin(radians) * velocity;
    const size = 5 + (i % 5);
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const delay = (i % 4) * 0.05;
    return { id: i, tx, ty, size, color, delay };
  });

  return (
    <motion.div 
      animate={showCelebration ? { scale: [1, 1.02, 0.98, 1], rotate: [0, 0.5, -0.5, 0] } : {}}
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className={`relative bg-white border-l-4 border-y border-r rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md border-slate-200 ${borderLColor} ${
        task.completed ? "opacity-75" : ""
      }`}
    >
      {/* Celebration animation effects */}
      <AnimatePresence>
        {showCelebration && (
          <>
            {/* Confetti particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: "-50%", y: "-50%", scale: 0, opacity: 1, left: "50%", top: "50%" }}
                  animate={{ 
                    x: `calc(-50% + ${p.tx}px)`, 
                    y: `calc(-50% + ${p.ty}px)`, 
                    scale: [0, 1.2, 0.8, 0],
                    opacity: [1, 1, 0.4, 0],
                    rotate: [0, 180, 360]
                  }}
                  transition={{ 
                    duration: 0.8 + Math.random() * 0.5, 
                    delay: p.delay,
                    ease: "easeOut"
                  }}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                  }}
                />
              ))}
            </div>

            {/* Checkmark Splash POP Overlay */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.15, 1], opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, times: [0, 0.2, 0.8, 1], ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 bg-white/40 backdrop-blur-xs rounded-2xl"
            >
              <div className="bg-emerald-500 text-white rounded-full p-4 shadow-xl shadow-emerald-500/35 flex items-center justify-center">
                <motion.svg
                  className="w-10 h-10 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3.5}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </motion.svg>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Card Header area */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <button 
              onClick={handleToggleComplete}
              className="mt-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              {task.completed ? (
                <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-50" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            
            <div>
              <h3 className={`font-sans font-bold text-slate-800 transition-all ${task.completed ? "line-through text-slate-400" : ""}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={getPriorityStyle(task.priority)}>
              {task.priority === "Critical" ? "🔴 Critical" : task.priority === "Soon" ? "🟡 Soon" : "🟢 Okay"}
            </span>
            
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              <Calendar className="w-3.5 h-3.5" />
              <span className={isOverdue ? "text-red-500 font-bold" : ""}>
                {task.deadline} {isOverdue && "(Overdue)"}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic details strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-50 pt-3">
          <div className="flex items-center gap-2">
            {daysRemaining === 0 ? (
              <span className="text-[10px] bg-red-50 text-red-600 font-black uppercase rounded-md px-2 py-0.5">Due Today</span>
            ) : daysRemaining === 1 ? (
              <span className="text-[10px] bg-amber-50 text-amber-600 font-black uppercase rounded-md px-2 py-0.5">Due Tomorrow</span>
            ) : daysRemaining > 1 ? (
              <span className="text-[10px] bg-slate-100 text-slate-500 font-black uppercase rounded-md px-2 py-0.5">{daysRemaining} days left</span>
            ) : null}

            {task.subtasks.length > 0 && (
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">
                {completedSubtasks}/{totalSubtasks} steps ({progressPercent}%)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 flex items-center gap-1 cursor-pointer transition-colors"
            >
              Steps {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Dynamic Visual Progress Bar */}
        {totalSubtasks > 0 && (
          <div className="mt-4 pt-3.5 border-t border-slate-100/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subtask Completion</span>
              <span className="text-[11px] font-bold text-slate-500">
                {completedSubtasks} of {totalSubtasks} steps
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    progressPercent === 100 
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]" 
                      : progressPercent > 66 
                        ? "bg-emerald-500" 
                        : progressPercent > 33 
                          ? "bg-amber-500" 
                          : "bg-blue-600"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className={`text-[11px] font-black tracking-tight shrink-0 ${
                progressPercent === 100 ? "text-emerald-600 font-extrabold" : "text-slate-500"
              }`}>
                {progressPercent}% Complete
              </span>
            </div>
          </div>
        )}

        {/* Collapsible Subtasks Section */}
        {isExpanded && task.subtasks.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3 space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">AI-Generated Roadmap</h4>
            {task.subtasks.map((sub) => (
              <div 
                key={sub.id} 
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 hover:bg-slate-50 border border-slate-100/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleToggleSubtask(sub.id)}
                    className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    {sub.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <span className={`text-xs font-medium text-slate-700 ${sub.completed ? "line-through text-slate-400 opacity-60" : ""}`}>
                    {sub.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {sub.estimatedMinutes}m
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Area - Quick Tools */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onAskAI(task)}
            className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
            title="Ask AI productivity mentor about this task"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Plan with AI</span>
          </button>

          {task.role === "Professional" && (
            <button
              onClick={() => onGenerateDraft(task)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
              title="Draft quick email or message status"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Draft message</span>
            </button>
          )}

          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
            title="Add event to Google Calendar"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Add to Calendar</span>
          </a>
        </div>

        <button
          onClick={() => onDeleteTask(task.id)}
          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
          title="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
