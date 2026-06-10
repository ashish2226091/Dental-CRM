import React from 'react';
import { Clock, Send } from 'lucide-react';
import { Patient } from '../types';

interface TabChatLogProps {
  selectedPatient: Patient;
  localNote: string;
  setLocalNote: (val: string) => void;
  submitLocalNote: () => void;
  onNextStep: () => void;
}

export default function TabChatLog({
  selectedPatient,
  localNote,
  setLocalNote,
  submitLocalNote,
  onNextStep
}: TabChatLogProps) {
  // Persona colored indicator mapping helper
  const getPersonaColor = (persona: string) => {
    const pLower = persona.toLowerCase();
    if (pLower.includes('receptionist')) return 'bg-sky-55/80 border-sky-100 text-sky-700';
    if (pLower.includes('junior')) return 'bg-amber-55/80 border-amber-150 text-amber-800';
    if (pLower.includes('senior') || pLower.includes('doctor') || pLower.includes('dentist')) return 'bg-emerald-55/80 border-emerald-150 text-emerald-800';
    return 'bg-slate-55/80 border-slate-150 text-slate-700';
  };

  return (
    <div id="tab-content-tab_c" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6 animate-fadeIn">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-600" />
          Section C: Centralized Interaction & Chat Log
        </h3>
        <p className="text-[11.5px] text-slate-500 mt-1">
          Scrollable timeline showing exactly who said what to the patient (Receptionist, Junior Doctor, Senior Doctor summaries).
        </p>
      </div>

      <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
        {selectedPatient.history && selectedPatient.history.length > 0 ? (
          selectedPatient.history.map((logLine, index) => {
            let persona = "Staff Operations";
            let noteDetails = logLine;
            if (logLine.includes('|')) {
              const parts = logLine.split('|');
              persona = parts[0].trim();
              noteDetails = parts.slice(1).join('|').trim();
            }

            return (
              <div 
                key={index} 
                className="p-4 bg-slate-50 text-slate-800 rounded-2xl border border-slate-200/65 flex flex-col gap-2 transition-all hover:bg-slate-100/50"
              >
                <div className="flex items-center justify-between leading-none pb-1 border-b border-slate-200/40">
                  <span className={`text-[10px] font-mono font-extrabold uppercase px-2.5 py-1 rounded-lg border ${getPersonaColor(persona)}`}>
                    {persona.replace('Logged by', '').trim()}
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">Dossier Step #{index + 1}</span>
                </div>
                <p className="text-xs md:text-[13px] text-slate-700 font-medium leading-relaxed">{noteDetails}</p>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-slate-500 italic text-center py-6 bg-slate-50 rounded-xl">No historical timeline logs recorded yet.</p>
        )}
      </div>

      {/* Quick manual note append */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 flex flex-col gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Append Dentist Log</span>
        <div className="flex gap-2">
          <input 
            id="quick-add-note-tab-c"
            type="text"
            placeholder="Log dentist comments, diagnostic updates, or receptionist remarks here..."
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitLocalNote();
            }}
            className="flex-1 bg-white border border-slate-250 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          />
          <button 
            onClick={submitLocalNote}
            className="bg-slate-900 border-0 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" /> Log Step
          </button>
        </div>
      </div>

      {/* Wizard Navigation Footer */}
      <div className="border-t border-slate-100 pt-5 flex justify-end">
        <button
          id="wizard-move-to-tab-d"
          onClick={onNextStep}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-3.5 rounded-xl shadow-md cursor-pointer border-0 flex items-center gap-1.5 transition-all outline-none"
        >
          ➡️ Next Step: View Treatment Creator & Billings
        </button>
      </div>
    </div>
  );
}
