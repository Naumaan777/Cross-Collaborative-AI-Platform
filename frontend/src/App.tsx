import React, { useState, useEffect } from 'react';
import { Plane, ShieldAlert, Compass, Calendar, Wallet, Layers, Loader2, History } from 'lucide-react';
import type { OrchestratorResult, AuditLog } from './types';
import { isSafeError } from './utils/errors';

const API_BASE = 'http://localhost:3001/api';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResult | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBackendLive, setIsBackendLive] = useState<boolean>(false);

  // Fetch the execution history/audit log trail & serve as system health check
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit-logs`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
        setIsBackendLive(true);
      } else {
        setIsBackendLive(false);
      }
    } catch (err) {
      console.error('Failed to load system audit trails.', err);
      setIsBackendLive(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    
    // Background polling interval to check server status every 5 seconds
    const statusPoll = setInterval(fetchAuditLogs, 5000);
    return () => clearInterval(statusPoll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/plan-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error('System orchestrator failed to compile request context.');
      
      const data: OrchestratorResult = await res.json();
      setResult(data);
      fetchAuditLogs(); 
    } catch (err) {
        const exception = err && typeof err === 'object' ? err : {};
        if (isSafeError(exception)) {
          setError(exception.message);
        } else {
          setError('An unexpected network or engine runtime event occurred.');
        }
        setIsBackendLive(false); // Set status to offline on network request exceptions
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Plane className="h-6 w-6 text-indigo-400 animate-pulse" />
          <div>
            <h1 className="font-bold text-lg tracking-tight">Cross-Collaborative AI Platform</h1>
            <p className="text-xs text-slate-400">Multi-Agent Orchestration Routing Layer [MVP v1]</p>
          </div>
        </div>
        
        {/* Dynamic Status Badge Indicator Block */}
        {isBackendLive ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono transition-all duration-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Backend Live
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-xs font-mono transition-all duration-300">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Backend Offline
          </div>
        )}
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Control and Execution Column */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-800/40 border border-slate-700/60 p-6 rounded-xl shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Submit Query Engine</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A five day trip somewhere warm in Europe for under 1500 pounds..."
                className="w-full h-28 px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition resize-none font-medium"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim() || !isBackendLive}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Orchestrating Specialized Agent Pipeline...
                  </>
                ) : !isBackendLive ? (
                  'Waiting for Backend Service connection...'
                ) : (
                  'Execute Agent Chain'
                )}
              </button>
            </form>
          </section>

          {/* Operational Errors Display */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-lg flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">System Interruption Event</h3>
                <p className="text-xs text-rose-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Live Output Section */}
          {result && (
            <div className="space-y-6">
              <section className="bg-slate-800/40 border border-slate-700/60 p-6 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Agent Contribution Ledger</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {result.agentTraces.map((trace, idx) => {
                    const isDest = trace.agentName === 'Destination Agent';
                    const isItin = trace.agentName === 'Itinerary Agent';
                    return (
                      <div key={idx} className="bg-slate-950/60 border border-slate-800 p-4 rounded-lg relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                          {isDest && <Compass className="h-4 w-4 text-sky-400" />}
                          {isItin && <Calendar className="h-4 w-4 text-amber-400" />}
                          {!isDest && !isItin && <Wallet className="h-4 w-4 text-emerald-400" />}
                          <span className="text-xs font-bold text-slate-200">{trace.agentName}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-400 line-clamp-4">
                          {trace.output || 'Agent skipped or bypassed by the dynamic route manager.'}
                        </p>
                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${trace.executed ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">
                            {trace.executed ? 'Contributed' : 'Bypassed'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Synthesized Response Output */}
              <section className="bg-slate-800/80 border border-slate-700 p-6 rounded-xl shadow-xl space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Synthesized Engine Response</h2>
                <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                  {result.synthesizedAnswer}
                </div>
                <div className="pt-4 border-t border-slate-700/50 flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>TX_ID: {result.requestId}</span>
                  <span>Isolation Level: Sequential Trace Chain</span>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Audit Trails Side Navigation Column */}
        <div className="lg:col-span-1">
          <section className="bg-slate-800/20 border border-slate-800 p-6 rounded-xl h-[calc(100vh-120px)] sticky top-24 flex flex-col">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800 mb-4">
              <History className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Audit Trails Interaction Log</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600 font-mono">
                  {isBackendLive 
                    ? 'No execution traces persisted in local SQLite environment.' 
                    : 'Unable to communicate with localized audit storage system.'}
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div 
                    key={log.id} 
                    onClick={() => setResult({ requestId: log.id, synthesizedAnswer: log.finalResponse, agentTraces: log.traces })}
                    className="p-3 bg-slate-950/40 border border-slate-800/80 hover:border-indigo-500/40 rounded-lg cursor-pointer transition text-left space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                      <span>ID: {log.id}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-300 truncate">"{log.userPrompt}"</p>
                    <div className="flex flex-wrap gap-1">
                      {log.agentsTriggered.split(', ').map((a, i) => (
                        <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/30">
                          {a.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

      </main>
    </div>
  );
}