import React, { useState } from "react";
import { Trophy, RefreshCw, Trash2, Plus, Edit3, Trash, X } from "lucide-react";

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
  const [editingDetails, setEditingDetails] = useState<Record<string, any>>({});

  const handleEditChange = (matchId: string, field: string, val: string | number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    
    setEditingDetails(prev => ({
      ...prev,
      [matchId]: { 
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeName: match.homePlayerName,
        awayName: match.awayPlayerName,
        round: match.round,
        ...(prev[matchId] || {}),
        [field]: val 
      }
    }));
  };

  const handleSaveDetails = async (matchId: string) => {
    const details = editingDetails[matchId];
    if (!details) return;

    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const parseScore = (s: any) => {
      if (s === '' || s === undefined || s === null) return 0;
      const parsed = parseInt(s);
      return isNaN(parsed) ? 0 : parsed;
    };

    const newHomeScore = details.homeScore !== undefined ? parseScore(details.homeScore) : match.homeScore;
    const newAwayScore = details.awayScore !== undefined ? parseScore(details.awayScore) : match.awayScore;
    const newHomeName = details.homeName ?? match.homePlayerName;
    const newAwayName = details.awayName ?? match.awayPlayerName;
    const newRound = details.round ?? match.round;

    if (newHomeScore !== match.homeScore || newAwayScore !== match.awayScore) {
       await updateMatchScore(matchId, newHomeScore, newAwayScore);
    }

    if (newHomeName !== match.homePlayerName || newAwayName !== match.awayPlayerName || newRound !== match.round) {
       await updateMatchDetails(matchId, {
         homePlayerName: newHomeName,
         awayPlayerName: newAwayName,
         round: newRound
       });
    }

    const { [matchId]: _, ...rest } = editingDetails;
    setEditingDetails(rest);
  };

  const rounds = Array.from(new Set(matches.map(m => m.round))).filter(Boolean).sort((a, b) => {
    const priority = (s: string) => {
      const lower = s.toLowerCase();
      if (lower.includes('round of 16') || lower.includes('r16') || lower === 'round 1' || lower === 'knockout') return 1;
      if (lower.includes('quarter final')) return 2;
      if (lower.includes('semi final')) return 3;
      if (lower.includes('grand final')) return 4;
      if (lower.startsWith('group')) return 0;
      return 99;
    };
    return priority(a as string) - priority(b as string) || (a as string).localeCompare(b as string);
  });

  return (
    <section className="glass-panel rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col border border-white/5 bg-white/[0.01] backdrop-blur-xl">
      <header className="p-4 md:p-7 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.02] gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="text-primary w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-xl font-black text-white italic tracking-tighter uppercase">Match Center</h3>
            <p className="text-[9px] md:text-[11px] text-white/30 font-extrabold uppercase tracking-wider">
              {matches.length} matches across {rounds.length} rounds
            </p>
          </div>
        </div>
        <div className={`flex flex-col md:flex-row items-center gap-2 w-full md:w-auto ${!overrideMode ? 'opacity-50 pointer-events-none' : ''}`}>
          {matches.length === 0 && approvedPlayers.length > 0 && (
            <button
              disabled={!overrideMode}
              onClick={generateFixtures}
              className="w-full md:w-auto px-4 py-2 bg-secondary text-white text-[9px] md:text-[11px] font-extrabold rounded-lg md:rounded-xl uppercase tracking-wider hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-secondary/10"
            >
              <RefreshCw className="w-3 md:w-3.5 h-3 md:h-3.5" /> Generate Fixtures
            </button>
          )}
          {matches.length > 0 && (
            <button
              disabled={!overrideMode}
              onClick={deleteAllMatches}
              className="w-full md:w-auto px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] md:text-[11px] font-extrabold rounded-lg md:rounded-xl uppercase tracking-wider hover:bg-red-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Trash2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> Reset
            </button>
          )}
          {matches.length > 0 && (
            <button
              disabled={!overrideMode}
              onClick={() => selectedTournament && reseedStage(selectedTournament.id)}
              className="w-full md:w-auto px-4 py-2 bg-white/5 text-white/50 border border-white/10 text-[9px] md:text-[11px] font-extrabold rounded-lg md:rounded-xl uppercase tracking-wider hover:bg-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-3 md:w-3.5 h-3 md:h-3.5" /> Reseed
            </button>
          )}
          <button
            disabled={!overrideMode}
            onClick={() => setShowNewMatchForm(!showNewMatchForm)}
            className="w-full md:w-auto px-4 py-2 bg-primary/20 text-primary border border-primary/20 text-[9px] md:text-[11px] font-extrabold rounded-lg md:rounded-xl uppercase tracking-wider hover:bg-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-3 md:w-3.5 h-3 md:h-3.5" /> Custom Match
          </button>
        </div>
      </header>

      {showNewMatchForm && overrideMode && (
        <form onSubmit={createCustomMatch} className="p-4 md:p-6 bg-primary/[0.03] border-b border-white/5 grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <label className="text-[9px] md:text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Round</label>
            <input required value={newMatchData.stage} onChange={e => setNewMatchData({ ...newMatchData, stage: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-xl md:rounded-2xl px-4 py-2.5 md:py-3 text-[12px] md:text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="e.g. SF" />
          </div>
          <div className="flex flex-col gap-1.5 md:gap-2">
            <label className="text-[9px] md:text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Home</label>
            <select required value={newMatchData.homePlayerId} onChange={e => setNewMatchData({ ...newMatchData, homePlayerId: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-[12px] md:text-sm text-white font-bold focus:border-primary/50 outline-none">
              <option value="">Select Home</option>
              {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 md:gap-2">
            <label className="text-[9px] md:text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Away</label>
            <select required value={newMatchData.awayPlayerId} onChange={e => setNewMatchData({ ...newMatchData, awayPlayerId: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-xl md:rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-[12px] md:text-sm text-white font-bold focus:border-primary/50 outline-none">
              <option value="">Select Away</option>
              {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button type="submit" className="h-[42px] md:h-[48px] bg-primary text-background-dark font-black text-[10px] uppercase tracking-[0.2em] rounded-xl md:rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10">Add</button>
        </form>
      )}

      <div className="p-3 md:p-6">
        <div className="space-y-8 md:space-y-12">
          {rounds.map(round => (
            <div key={round as string} className="space-y-3 md:space-y-5">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-1 md:w-1.5 h-4 md:h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(15,164,175,0.4)]" />
                <h4 className="text-[11px] md:text-sm font-black italic uppercase tracking-[0.2em] text-white/40">{round as string}</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {matches.filter(m => m.round === round).sort((a,b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map(match => (
                  <div key={match.id} className="group relative">
                    <div className="absolute inset-0 bg-primary/5 blur-xl group-hover:opacity-100 opacity-0 transition-opacity" />
                    <div className="relative glass-panel bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[2rem] p-4 md:p-5 transition-all hover:bg-white/[0.04]">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full">#{match.matchIndex}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            disabled={!overrideMode}
                            onClick={() => toggleMatchStatus(match.id, match.status)} 
                            className={`px-2 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase transition-all ${match.status === 'completed' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}
                          >
                            {match.status}
                          </button>
                          {overrideMode && (
                            <button onClick={() => deleteMatch(match.id)} className="p-1 text-white/10 hover:text-red-500 transition-colors">
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 md:space-y-4">
                        {[
                          { player: match.homePlayerName, score: match.homeScore, side: 'home', nameField: 'homeName', scoreField: 'homeScore' },
                          { player: match.awayPlayerName, score: match.awayScore, side: 'away', nameField: 'awayName', scoreField: 'awayScore' }
                        ].map((p, i) => {
                          const isWinner = match.status === 'completed' && match.homeScore !== match.awayScore && ((i === 0 && match.homeScore > match.awayScore) || (i === 1 && match.awayScore > match.homeScore));
                          const nameVal = editingDetails[match.id]?.[p.nameField as 'homeName' | 'awayName'] ?? p.player;
                          const scoreVal = editingDetails[match.id]?.[p.scoreField as 'homeScore' | 'awayScore'] ?? p.score ?? 0;
                          
                          return (
                          <div key={i} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                               <div className="w-6 h-6 rounded-lg bg-surface-dark flex items-center justify-center border border-white/5 shrink-0">
                                <span className="text-[10px] font-black text-white/20">{p.player.charAt(0)}</span>
                              </div>
                              {overrideMode ? (
                                <input
                                  type="text"
                                  value={nameVal}
                                  onChange={(e) => handleEditChange(match.id, p.nameField, e.target.value)}
                                  onBlur={() => handleSaveDetails(match.id)}
                                  className={`w-full bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 rounded font-black italic uppercase truncate focus:bg-primary/10 focus:border-primary/30 outline-none px-2 py-1 -ml-2 text-[11px] md:text-sm transition-all focus:text-primary ${isWinner ? 'text-primary' : (p.player === 'TBD' ? 'text-white/20' : 'text-white/60')}`}
                                />
                              ) : (
                                <span className={`text-[11px] md:text-sm font-black italic uppercase truncate ${isWinner ? 'text-primary' : (p.player === 'TBD' ? 'text-white/10' : 'text-white/60')}`}>
                                  {p.player}
                                </span>
                              )}
                            </div>
                            {overrideMode ? (
                              <input
                                type="number"
                                value={scoreVal}
                                onChange={(e) => handleEditChange(match.id, p.scoreField, e.target.value === '' ? '' : parseInt(e.target.value))}
                                onBlur={() => handleSaveDetails(match.id)}
                                className={`w-12 bg-transparent hover:bg-white/5 border border-transparent hover:border-white/10 rounded text-center font-black py-1 focus:bg-primary/10 focus:border-primary/30 outline-none appearance-none text-sm md:text-lg focus:text-primary transition-all ${match.status === 'completed' ? 'text-white' : 'text-white/20'}`}
                              />
                            ) : (
                              <span className={`text-sm md:text-lg font-black italic ${match.status === 'completed' ? 'text-white' : 'text-white/20'} w-12 text-center`}>
                                {p.score ?? 0}
                              </span>
                            )}
                          </div>
                        )})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {matches.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/5">
              <Trophy className="w-12 h-12 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-[0.2em]">Ready for kick-off</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default MatchCenter;
