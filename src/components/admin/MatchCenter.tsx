import React from "react";
import { Trophy, RefreshCw, Trash2, Plus, Edit3, Trash } from "lucide-react";

interface MatchCenterProps {
  matches: any[];
  approvedPlayers: any[];
  selectedTournament: any;
  generateFixtures: () => void;
  deleteAllMatches: () => void;
  reseedStage: (id: string) => void;
  overrideMode: boolean;
  showNewMatchForm: boolean;
  setShowNewMatchForm: (val: boolean) => void;
  createCustomMatch: (e: React.FormEvent) => void;
  newMatchData: { homePlayerId: string; awayPlayerId: string; stage: string };
  setNewMatchData: (data: { homePlayerId: string; awayPlayerId: string; stage: string }) => void;
  toggleMatchStatus: (id: string, currentStatus: string) => void;
  updateMatchScore: (id: string, homeScore: number, awayScore: number) => void;
  deleteMatch: (id: string) => void;
  updateMatchDetails: (id: string, updates: any) => void;
}

const MatchCenter: React.FC<MatchCenterProps> = ({
  matches,
  approvedPlayers,
  selectedTournament,
  generateFixtures,
  deleteAllMatches,
  reseedStage,
  overrideMode,
  showNewMatchForm,
  setShowNewMatchForm,
  createCustomMatch,
  newMatchData,
  setNewMatchData,
  toggleMatchStatus,
  updateMatchScore,
  deleteMatch,
  updateMatchDetails
}) => {
  return (
    <section className="glass-panel rounded-[2rem] overflow-hidden flex flex-col border border-white/5 bg-white/[0.01] backdrop-blur-xl">
      <div className="p-5 md:p-7 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.02] gap-4">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="text-primary w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="text-base md:text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Match Center</h3>
            <p className="text-[10px] md:text-[11px] text-white/30 font-extrabold uppercase tracking-wider">
              {(() => {
                const latestRound = Array.from(new Set(matches.map(m => m.round))).filter(Boolean).pop();
                if (!latestRound) return `${matches.length} matches total`;
                const roundMatches = matches.filter(m => m.round === latestRound);
                const completedCount = roundMatches.filter(m => m.status === 'completed').length;
                return (
                  <>
                    <span className="text-primary">{latestRound}</span>: {completedCount}/{roundMatches.length} Completed
                  </>
                );
              })()}
            </p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          {matches.length === 0 && approvedPlayers.length > 0 && (
            <button
              onClick={generateFixtures}
              className="w-full md:w-auto px-5 py-2.5 bg-secondary text-white text-[10px] md:text-[11px] font-extrabold rounded-xl uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-secondary/10"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Generate Fixtures
            </button>
          )}
          {matches.length > 0 && (
            <button
              onClick={deleteAllMatches}
              className="w-full md:w-auto px-5 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] md:text-[11px] font-extrabold rounded-xl uppercase tracking-wider hover:bg-red-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              title="Delete all matches and reset standings"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset All Matches
            </button>
          )}
          {matches.length > 0 && (
            <button
              onClick={() => selectedTournament && reseedStage(selectedTournament.id)}
              className="w-full md:w-auto px-5 py-2.5 bg-white/5 text-white/50 border border-white/10 text-[10px] md:text-[11px] font-extrabold rounded-xl uppercase tracking-wider hover:bg-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
              title="Clear current knockout stage and regenerate from previous winners"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reseed Stage
            </button>
          )}
          {overrideMode && (
            <button
              onClick={() => setShowNewMatchForm(!showNewMatchForm)}
              className="w-full md:w-auto px-5 py-2.5 bg-primary/20 text-primary border border-primary/20 text-[10px] md:text-[11px] font-extrabold rounded-xl uppercase tracking-wider hover:bg-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Next Stage Match
            </button>
          )}
        </div>
      </div>

      {showNewMatchForm && (
        <form onSubmit={createCustomMatch} className="p-6 bg-primary/[0.03] border-b border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Stage / Round</label>
            <input required value={newMatchData.stage} onChange={e => setNewMatchData({ ...newMatchData, stage: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="e.g. Quarter Final" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Home Player</label>
            <select required value={newMatchData.homePlayerId} onChange={e => setNewMatchData({ ...newMatchData, homePlayerId: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:border-primary/50 outline-none">
              <option value="" disabled>Select Home</option>
              {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name} {p.group ? `(${p.group})` : ''}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Away Player</label>
            <select required value={newMatchData.awayPlayerId} onChange={e => setNewMatchData({ ...newMatchData, awayPlayerId: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:border-primary/50 outline-none">
              <option value="" disabled>Select Away</option>
              {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name} {p.group ? `(${p.group})` : ''}</option>)}
            </select>
          </div>
          <button type="submit" className="h-[48px] bg-primary text-background-dark font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10">Add Match</button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto max-h-[700px] custom-scrollbar">
        <div className="divide-y divide-white/5">
          {Object.entries(
            matches.reduce((acc: Record<string, any[]>, m) => {
              const r = m.round || "Unassigned";
              if (!acc[r]) acc[r] = [];
              acc[r].push(m);
              return acc;
            }, {})
          ).sort(([a], [b]) => {
            const priority = (s: string) => {
              const lower = s.toLowerCase();
              if (lower.includes('round of 16') || lower.includes('r16') || lower === 'round 1') return 1;
              if (lower.includes('quarter final')) return 2;
              if (lower.includes('semi final')) return 3;
              if (lower.includes('grand final')) return 4;
              if (lower.startsWith('group')) return 0;
              return 99;
            };
            return priority(a) - priority(b) || a.localeCompare(b);
          }).map(([roundName, roundMatches]) => {
            const typedMatches = roundMatches as any[];
            return (
              <div key={roundName} className="p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-[0.3em] italic">{roundName}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{typedMatches.length} Fixtures</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {typedMatches.sort((a,b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map((match) => (
                    <div key={match.id} className="group relative">
                      <div className="absolute inset-0 bg-primary/5 blur-xl group-hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100" />
                      <div className="relative bg-background-dark/40 border border-white/5 group-hover:border-primary/20 rounded-2xl p-4 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Match #{match.matchIndex}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleMatchStatus(match.id, match.status)} className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all ${match.status === 'completed' ? 'bg-secondary text-white' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>{match.status === 'completed' ? 'Completed' : 'Pending'}</button>
                            <button onClick={() => deleteMatch(match.id)} className="p-1 text-white/10 hover:text-red-500 transition-colors"><Trash className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-bold text-white/70 italic uppercase truncate shrink-0">{match.homePlayerName}</span>
                              <div className="flex-1 h-px bg-white/5" />
                              <input type="number" value={match.homeScore ?? 0} onChange={(e) => updateMatchScore(match.id, parseInt(e.target.value) || 0, match.awayScore ?? 0)} className="w-12 bg-white/5 border border-white/10 rounded-lg text-center font-black text-primary py-1 focus:border-primary/50 outline-none" />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-bold text-white/70 italic uppercase truncate shrink-0">{match.awayPlayerName}</span>
                              <div className="flex-1 h-px bg-white/5" />
                              <input type="number" value={match.awayScore ?? 0} onChange={(e) => updateMatchScore(match.id, match.homeScore ?? 0, parseInt(e.target.value) || 0)} className="w-12 bg-white/5 border border-white/10 rounded-lg text-center font-black text-primary py-1 focus:border-primary/50 outline-none" />
                            </div>
                          </div>
                          {overrideMode && (
                            <button onClick={() => {
                              const newHome = prompt("New Home Player Name:", match.homePlayerName);
                              const newAway = prompt("New Away Player Name:", match.awayPlayerName);
                              const newRound = prompt("New Round Name:", match.round);
                              if (newHome || newAway || newRound) {
                                updateMatchDetails(match.id, {
                                  homePlayerName: newHome || match.homePlayerName,
                                  awayPlayerName: newAway || match.awayPlayerName,
                                  round: newRound || match.round
                                });
                              }
                            }} className="p-2 bg-white/5 rounded-xl text-white/20 hover:text-primary transition-colors"><Edit3 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {matches.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
              <Trophy className="w-12 h-12 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest italic">No fixtures generated yet</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MatchCenter;
