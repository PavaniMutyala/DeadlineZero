import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertTriangle, 
  Lightbulb, 
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Task, UserRole, ChatMessage, Nudge } from "../types";

interface AIChatPanelProps {
  role: UserRole;
  tasks: Task[];
  chatHistory: ChatMessage[];
  nudges: Nudge[];
  isLoadingNudges: boolean;
  onSendMessage: (text: string) => Promise<void>;
  isChatLoading: boolean;
}

export default function AIChatPanel({
  role,
  tasks,
  chatHistory,
  nudges,
  isLoadingNudges,
  onSendMessage,
  isChatLoading
}: AIChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [showNudges, setShowNudges] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isChatLoading) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handlePresetClick = (presetText: string) => {
    if (isChatLoading) return;
    onSendMessage(presetText);
  };

  const getNudgeIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
      case "tip":
        return <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const getNudgeStyle = (type: string) => {
    switch (type) {
      case "warning":
        return "bg-rose-50/70 border-rose-100 text-rose-900";
      case "tip":
        return "bg-amber-50/70 border-amber-100 text-amber-900";
      default:
        return "bg-sky-50/70 border-sky-100 text-sky-900";
    }
  };

  return (
    <div className="w-full lg:w-[320px] border-l border-slate-200 bg-white flex flex-col h-full shrink-0">
      
      {/* Nudge Area */}
      <div className="border-b border-slate-100 p-6 shrink-0 bg-white">
        <button 
          onClick={() => setShowNudges(!showNudges)}
          className="flex items-center justify-between w-full cursor-pointer hover:opacity-85 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">AI Coach Nudges</h2>
          </div>
          {showNudges ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showNudges && (
          <div className="space-y-3 pt-4">
            {isLoadingNudges ? (
              <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Generating recommendations...</span>
              </div>
            ) : nudges.length > 0 ? (
              nudges.slice(0, 2).map((nudge, i) => (
                <div 
                  key={i} 
                  className="bg-blue-50 p-4 rounded-xl border border-blue-100 animate-fade-in"
                >
                  <p className="text-[11px] font-black text-blue-600 uppercase mb-1.5 flex items-center gap-1">
                    {nudge.type === "warning" ? "🚨" : nudge.type === "tip" ? "💡" : "⚡"} {nudge.title}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    "{nudge.content}"
                  </p>
                  <button
                    onClick={() => handlePresetClick(nudge.content)}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/15 cursor-pointer text-center block"
                  >
                    {nudge.actionLabel || "Review Option"}
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3">
                <p className="text-[11px] font-bold text-slate-400">All tasks fully optimized. No active warnings.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F8FAFC]/50">
        <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest text-center">AI Copilot Chat</p>
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800">Cortex Advisor</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-[220px]">
                Ask me to schedule your tasks, draft status updates, or re-order high priority deadlines.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full pt-2">
              <button
                onClick={() => handlePresetClick("Create a 3-hour hyper-focus study schedule for my upcoming exams.")}
                className="text-left text-[11px] bg-white hover:bg-blue-50/50 hover:text-blue-600 p-2.5 rounded-xl text-slate-600 font-semibold transition-all cursor-pointer border border-slate-200 shadow-2xs"
              >
                📝 "Give me a focus schedule"
              </button>
              <button
                onClick={() => handlePresetClick("Do I have too many conflicting deadlines? Check for workload overload.")}
                className="text-left text-[11px] bg-white hover:bg-blue-50/50 hover:text-blue-600 p-2.5 rounded-xl text-slate-600 font-semibold transition-all cursor-pointer border border-slate-200 shadow-2xs"
              >
                🚨 "Check for overload risks"
              </button>
            </div>
          </div>
        ) : (
          chatHistory.map((msg, i) => (
            <div 
              key={i} 
              className={`flex items-start gap-2.5 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${msg.role === "user" ? "bg-slate-200 text-slate-700" : "bg-blue-50 text-blue-600"}`}>
                {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div 
                className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                  msg.role === "user" ? "bg-slate-900 text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isChatLoading && (
          <div className="flex items-start gap-2.5 max-w-[90%] mr-auto">
            <div className="p-2 rounded-xl shrink-0 bg-blue-50 text-blue-600">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3 bg-white text-slate-400 border border-slate-100 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 shrink-0 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="Ask Gemini..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isChatLoading}
            className="w-full bg-slate-100 border-none rounded-full py-3 pl-5 pr-12 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner text-slate-800 placeholder-slate-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isChatLoading}
            className="absolute right-2 top-1.5 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors shadow-sm disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Send className="w-3 h-3 text-white" />
          </button>
        </div>
      </form>

    </div>
  );
}
