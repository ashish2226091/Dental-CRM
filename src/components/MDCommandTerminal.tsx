import React from 'react';

interface MDCommandTerminalProps {
  commandInput: string;
  setCommandInput: (val: string) => void;
  commandSuccess: string;
  commandError: string;
  handleExecuteCommand: (cmd: string) => void;
}

export default function MDCommandTerminal({
  commandInput,
  setCommandInput,
  commandSuccess,
  commandError,
  handleExecuteCommand
}: MDCommandTerminalProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 p-5 rounded-2xl shadow-md mb-6 animate-fadeIn">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
        <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">MD Practice Operational Console</span>
      </div>
      
      <p className="text-xs text-slate-400 mb-4">
        Execute natural clinical triggers. Enter commands below to manage clinic states chronologically.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleExecuteCommand(commandInput);
          }}
          placeholder="e.g. Add Patient Rahul Verma, Male, 31 years old"
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-xs text-indigo-300 font-mono outline-none placeholder-slate-600 transition-colors"
        />
        <button
          onClick={() => handleExecuteCommand(commandInput)}
          className="bg-indigo-600 hover:bg-indigo-700 font-bold px-6 py-3 rounded-xl text-xs text-white transition-all uppercase tracking-wider cursor-pointer border-0"
        >
          Run Command
        </button>
      </div>

      {commandSuccess && (
        <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-xl font-medium animate-fadeIn">
          ✓ {commandSuccess}
        </div>
      )}

      {commandError && (
        <div className="mt-3 p-3 bg-rose-950/80 border border-rose-900 text-rose-300 text-xs rounded-xl font-medium animate-fadeIn">
          ⚠ {commandError}
        </div>
      )}

      <div className="mt-4 border-t border-slate-800/80 pt-3">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Automated Clinician Playbooks (Click to Paste)</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCommandInput("Add Patient Rahul Verma, Male, 31")}
            className="text-[9px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            ✚ Add Patient Rahul Verma, Male, 31
          </button>
          <button
            onClick={() => setCommandInput("Add Patient Priya Sharma, Female, 28")}
            className="text-[9px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            ✚ Add Patient Priya Sharma, Female, 28
          </button>
          <button
            onClick={() => setCommandInput("Click Rahul Verma")}
            className="text-[9px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            🔎 Click Rahul Verma
          </button>
          <button
            onClick={() => setCommandInput("Update Rahul Verma with notes: Complained of root sensitivity and move to APPOINTMENT_SCHEDULED")}
            className="text-[9px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            ✎ Update Rahul and Move to Appt
          </button>
          <button
            onClick={() => setCommandInput("Back to Directory")}
            className="text-[9px] font-mono bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
          >
            ↩ Back to Directory
          </button>
        </div>
      </div>
    </div>
  );
}
