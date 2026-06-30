import React, { useState } from "react";
import { X, Sparkles, Loader2, Plus, Trash2, Clock } from "lucide-react";
import { Priority, UserRole, Subtask, Task } from "../types";

interface AddEditTaskModalProps {
  role: UserRole;
  onClose: () => void;
  onSave: (task: Task) => void;
}

export default function AddEditTaskModal({
  role,
  onClose,
  onSave
}: AddEditTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0] // Default tomorrow
  );
  const [priority, setPriority] = useState<Priority>("Soon");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual subtask addition
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskMinutes, setNewSubtaskMinutes] = useState(30);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSub: Subtask = {
      id: `manual-sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      estimatedMinutes: Number(newSubtaskMinutes) || 30,
      completed: false
    };
    setSubtasks([...subtasks, newSub]);
    setNewSubtaskTitle("");
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((sub) => sub.id !== id));
  };

  // AI-Powered Smart Task Breakdown
  const handleAIBreakdown = async () => {
    if (!title.trim()) {
      setError("Please enter a task title first so Gemini can break it down.");
      return;
    }
    setError(null);
    setIsBreakingDown(true);

    try {
      const response = await fetch("/api/gemini/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, role })
      });

      if (!response.ok) {
        throw new Error("Failed to reach Gemini Breakdown API");
      }

      const generatedSteps = await response.json();
      if (Array.isArray(generatedSteps)) {
        const formattedSteps: Subtask[] = generatedSteps.map((step: any, i: number) => ({
          id: `ai-sub-${Date.now()}-${i}`,
          title: step.title || "Review requirements",
          estimatedMinutes: step.estimatedMinutes || 30,
          completed: false
        }));
        setSubtasks(formattedSteps);
      } else {
        throw new Error("Invalid format received from Gemini");
      }
    } catch (err: any) {
      console.error(err);
      setError("AI Breakdown failed. You can still add steps manually below.");
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline,
      priority,
      completed: false,
      role,
      subtasks,
      createdAt: new Date().toISOString()
    };

    onSave(newTask);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-sans font-bold text-slate-800">Add Last-Minute Task</h2>
            <p className="text-xs text-slate-500 mt-0.5">Creating task for user role: <span className="font-semibold text-slate-700">{role}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g., Study for Organic Chemistry midterm, Finish client Q2 report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
            <textarea
              placeholder="Specify instructions, syllabus, or details to guide the AI-generated plan..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all resize-none"
            />
          </div>

          {/* Date & Priority Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deadline *</label>
              <input
                type="date"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Urgency Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all bg-white"
              >
                <option value="Critical">🔴 Critical (Immediate Attention)</option>
                <option value="Soon">🟡 Soon (Within 2-3 days)</option>
                <option value="Okay">🟢 Okay (Flexible/Low Stress)</option>
              </select>
            </div>
          </div>

          {/* AI Roadmap Generator */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                <h3 className="text-sm font-bold text-blue-950 font-sans">AI-Powered Roadmap Planner</h3>
              </div>
              <button
                type="button"
                onClick={handleAIBreakdown}
                disabled={isBreakingDown || !title.trim()}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isBreakingDown ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Breaking down...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Generate Steps</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-xs text-blue-800/80 mb-3">
              Gemini will analyze your task title, context, and role to generate a smart, step-by-step actionable plan with duration estimates.
            </p>

            {/* Subtasks List */}
            {subtasks.length > 0 ? (
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg">
                    <span className="text-xs text-slate-700 font-medium">{sub.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {sub.estimatedMinutes}m
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(sub.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 bg-white rounded-lg">
                No custom steps generated yet. Let Gemini generate them, or add below manually.
              </div>
            )}
          </div>

          {/* Add Manual Subtask */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Or Add Step Manually</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g., Proofread final draft"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
              />
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 bg-white">
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={newSubtaskMinutes}
                  onChange={(e) => setNewSubtaskMinutes(Number(e.target.value))}
                  className="w-12 py-2 text-xs text-slate-800 focus:outline-none text-center font-mono"
                />
                <span className="text-slate-400 text-xs">m</span>
              </div>
              <button
                type="button"
                onClick={handleAddSubtask}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Task
          </button>
        </div>

      </div>
    </div>
  );
}
