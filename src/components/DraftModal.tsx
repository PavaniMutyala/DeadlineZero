import React, { useState } from "react";
import { X, Copy, Check, Mail, Sparkles } from "lucide-react";
import { AutoDraft } from "../types";

interface DraftModalProps {
  draft: AutoDraft;
  taskTitle: string;
  onClose: () => void;
}

export default function DraftModal({ draft, taskTitle, onClose }: DraftModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-sans font-bold text-slate-800">AI Auto Draft Assistant</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Based on your professional deliverable <span className="font-semibold text-slate-700">"{taskTitle}"</span>, Gemini has crafted an update to prevent last-minute blockages:
          </p>

          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3 font-sans">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Subject / Header</span>
              <p className="text-sm font-semibold text-slate-800">{draft.subject}</p>
            </div>
            
            <hr className="border-slate-100" />

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Message Body</span>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-mono text-[13px] bg-white p-3 rounded-lg border border-slate-100">
                {draft.body}
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Direct copy-paste ready
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                copied ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Draft</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
