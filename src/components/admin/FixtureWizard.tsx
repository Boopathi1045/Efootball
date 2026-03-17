import React from "react";
import { Trophy, Settings, Users, Check, X, RefreshCw, Plus, Trash2, Dices, CheckCircle2, PlusCircle } from "lucide-react";

interface FixtureWizardProps {
  fixtureWizardStep: number;
  setFixtureWizardStep: (step: number) => void;
  selectedFormat: string;
  setSelectedFormat: (format: string) => void;
  wizardGroupCount: number;
  setWizardGroupCount: (count: number) => void;
  roundRobinType: 'single' | 'double';
  setRoundRobinType: (type: 'single' | 'double') => void;
  targetQualifiers: number;
  setTargetQualifiers: (num: number) => void;
  qualifiersPerGroup: number;
  setQualifiersPerGroup: (num: number) => void;
  unassignedPlayers: any[];
  setUnassignedPlayers: (players: any[]) => void;
  groupAssignments: Record<string, any[]>;
  setGroupAssignments: (assignments: Record<string, any[]>) => void;
  wizardMatches: any[];
  setWizardMatches: (matches: any[]) => void;
  drawnMatchCount: number;
  setDrawnMatchCount: (count: number | ((prev: number) => number)) => void;
  isDrawing: boolean;
  isMatchDrawing: boolean;
  setIsMatchDrawing: (val: boolean) => void;
  shuffleNames: { home: string, away: string };
  setShuffleNames: (val: { home: string, away: string }) => void;
  players: any[];
  selectedTournament: any;
  finalizeWizardStep2: () => void;
  finalizeToStep3: () => void;
  handleRandomizeDraw: () => void;
  onDragStart: (e: React.DragEvent, player: any, from: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, to: string) => void;
  getNearestPowerOf2: (n: number) => number;
  calculateQualifiersPerGroup: (groups: number, target: number) => number;
  isPowerOf2: (n: number) => boolean;
  finalizeTournament: () => void;
  onClose: () => void;
}

const FixtureWizard: React.FC<FixtureWizardProps> = ({
  fixtureWizardStep,
  setFixtureWizardStep,
  selectedFormat,
  setSelectedFormat,
  wizardGroupCount,
  setWizardGroupCount,
  roundRobinType,
  setRoundRobinType,
  targetQualifiers,
  setTargetQualifiers,
  qualifiersPerGroup,
  setQualifiersPerGroup,
  unassignedPlayers,
  setUnassignedPlayers,
  groupAssignments,
  setGroupAssignments,
  wizardMatches,
  setWizardMatches,
  drawnMatchCount,
  setDrawnMatchCount,
  isDrawing,
  isMatchDrawing,
  setIsMatchDrawing,
  shuffleNames,
  setShuffleNames,
  players,
  selectedTournament,
  finalizeWizardStep2,
  finalizeToStep3,
  handleRandomizeDraw,
  onDragStart,
  onDragOver,
  onDrop,
  getNearestPowerOf2,
  calculateQualifiersPerGroup,
  isPowerOf2,
  finalizeTournament,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-[100] bg-background-dark/95 backdrop-blur-xl flex items-center justify-center p-3 md:p-6">
      <div className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-[24px] md:rounded-[32px] overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Wizard Header */}
        <div className="px-5 md:px-8 py-4 md:py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              <RefreshCw className="w-5 h-5 md:w-6 md:h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base md:text-xl font-black italic uppercase tracking-tighter text-white">Fixture Wizard</h3>
              <div className="flex items-center gap-2 mt-0.5 md:mt-1">
                {[1, 2, 3, 4, 5].map(step => (
                  <div key={step} className={`h-1 rounded-full transition-all duration-500 ${step <= fixtureWizardStep ? 'w-4 md:w-8 bg-primary shadow-[0_0_10px_rgba(15,164,175,0.5)]' : 'w-2 md:w-4 bg-white/10'}`} />
                ))}
                <span className="text-[8px] md:text-[10px] font-black uppercase text-primary ml-1 md:ml-2">Step {fixtureWizardStep}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar">
          {fixtureWizardStep === 1 && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-1 md:space-y-2">
                <h4 className="text-xl md:text-3xl font-black italic uppercase italic tracking-tighter text-white">Tournament Format</h4>
                <p className="text-white/40 text-[10px] md:text-sm">Choose how the matches will be structured.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {[
                  { id: 'knockout', title: 'Single Elimination', desc: 'Knockout only. Lose once and you\'re out.', icon: <Trash2 className="w-6 h-6 md:w-8 md:h-8" />, color: 'from-orange-500/20 to-red-500/20' },
                  { id: 'round_robin', title: 'Round Robin', desc: 'One big league. Everyone plays everyone.', icon: <Users className="w-6 h-6 md:w-8 md:h-8" />, color: 'from-blue-500/20 to-indigo-500/20' },
                  { id: 'hybrid', title: 'Hybrid Stage', desc: 'Group stages followed by Knockouts.', icon: <Trophy className="w-6 h-6 md:w-8 md:h-8" />, color: 'from-emerald-500/20 to-teal-500/20' }
                ].map((format) => (
                  <button
                    key={format.id}
                    onClick={() => { setSelectedFormat(format.id); setFixtureWizardStep(2); }}
                    className={`relative group p-6 md:p-8 rounded-2xl md:rounded-3xl border transition-all duration-300 text-left overflow-hidden bg-gradient-to-br ${format.color} ${selectedFormat === format.id ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'}`}
                  >
                    <div className="relative z-10 space-y-3 md:space-y-4">
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedFormat === format.id ? 'bg-primary text-background-dark scale-110' : 'bg-white/5 text-white group-hover:bg-white/10'}`}>
                        {format.icon}
                      </div>
                      <div>
                        <h5 className="text-base md:text-xl font-black italic uppercase tracking-tighter text-white">{format.title}</h5>
                        <p className="text-white/40 text-[10px] md:text-sm mt-1 leading-relaxed">{format.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {fixtureWizardStep === 2 && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <div className="text-center space-y-1 md:space-y-2">
                <h4 className="text-xl md:text-3xl font-black italic uppercase italic tracking-tighter text-white">Dynamic Setup</h4>
                <p className="text-white/40 text-[10px] md:text-sm leading-relaxed">Configuring the details for your <span className="text-primary font-bold">{selectedFormat?.replace('_', ' ')}</span></p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-6">
                {(selectedFormat === 'hybrid' || selectedFormat === 'round_robin') && (
                  <div className="space-y-3 md:space-y-4">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block">Number of Groups</label>
                    <div className="relative flex items-center justify-center max-w-[200px] mx-auto">
                      <button onClick={() => setWizardGroupCount(Math.max(1, wizardGroupCount - 1))} className="absolute left-0 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-xl font-black transition-colors z-10">-</button>
                      <input type="number" min="1" max="32" value={wizardGroupCount} onChange={(e) => setWizardGroupCount(parseInt(e.target.value) || 1)} className="w-full bg-background-dark/50 border border-primary/30 rounded-full px-10 py-3 text-center text-2xl md:text-4xl font-black italic text-white focus:outline-none focus:border-primary shadow-inner" />
                      <button onClick={() => setWizardGroupCount(wizardGroupCount + 1)} className="absolute right-0 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-xl font-black transition-colors z-10">+</button>
                    </div>
                  </div>
                )}

                {(selectedFormat === 'round_robin' || selectedFormat === 'hybrid') && (
                  <div className="space-y-3 md:space-y-4">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block">Match Cycle</label>
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      {[
                        { id: 'single', title: 'Single', desc: 'Once' },
                        { id: 'double', title: 'Double', desc: 'H & A' }
                      ].map(type => (
                        <button key={type.id} onClick={() => setRoundRobinType(type.id as any)} className={`p-3 md:p-4 rounded-xl md:rounded-2xl border transition-all ${roundRobinType === type.id ? 'bg-primary border-primary text-background-dark' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}>
                          <div className="text-[12px] md:text-sm font-black italic uppercase">{type.title}</div>
                          <div className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest mt-0.5">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFormat === 'knockout' && (
                  <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-4">
                    <div className="flex items-center gap-3 text-orange-500">
                      <Settings className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                      <h6 className="font-bold uppercase text-[10px] md:text-xs tracking-wider">Bracket Normalization</h6>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[12px] md:text-sm text-white/60 leading-relaxed">Verified Players: <span className="text-white font-bold">{players.filter(p => p.status === 'approved').length}</span></p>
                      {(() => {
                        const pCount = players.filter(p => p.status === 'approved').length;
                        const nearest = getNearestPowerOf2(pCount);
                        const byes = nearest - pCount;
                        return (
                          <div className="p-3 md:p-4 bg-background-dark/50 rounded-xl border border-white/5">
                            <div className="text-[10px] font-black underline uppercase text-primary tracking-widest mb-1">Logic Preview</div>
                            <div className="text-[11px] md:text-xs text-white/40">Target Bracket: <span className="text-white font-bold">{nearest}</span> slots | Byes: <span className="text-secondary font-black italic">{byes}</span></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 md:gap-4">
                <button onClick={() => setFixtureWizardStep(1)} className="flex-1 px-5 md:px-8 py-3 md:py-4 bg-white/5 text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-all">Back</button>
                <button onClick={finalizeWizardStep2} className="flex-[2] px-5 md:px-8 py-3 md:py-4 bg-primary text-background-dark font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-primary/10">Continue</button>
              </div>
            </div>
          )}

          {fixtureWizardStep === 2.5 && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <div className="text-center space-y-1 md:space-y-2">
                <h4 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Qualification</h4>
                <p className="text-white/40 text-[10px] md:text-sm">How many players lead to knockouts?</p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-8 space-y-6 md:space-y-8">
                <div className="space-y-4">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block">Final Target Bracket</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                    {[2, 4, 8, 16].map(num => (
                      <button key={num} onClick={() => { setTargetQualifiers(num); setQualifiersPerGroup(calculateQualifiersPerGroup(wizardGroupCount, num)); }} className={`p-4 md:p-6 rounded-xl md:rounded-2xl border transition-all ${targetQualifiers === num ? 'bg-primary border-primary text-background-dark' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}>
                        <div className="text-xl md:text-2xl font-black italic">{num}</div>
                        <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest mt-0.5">{num === 16 ? 'R16' : num === 8 ? 'QF' : num === 4 ? 'SF' : 'FINAL'}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 md:p-6 rounded-xl md:rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                  <div className="flex items-center gap-3 text-primary"><Check className="w-4 h-4 md:w-5 md:h-5 text-primary" /><h6 className="font-bold uppercase text-[10px] md:text-xs tracking-wider">Logic Verification</h6></div>
                  <div className={`p-3 md:p-4 rounded-xl border ${isPowerOf2(wizardGroupCount * qualifiersPerGroup) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-black uppercase tracking-widest">{wizardGroupCount * qualifiersPerGroup} Total Qualifiers</span></div>
                    <p className="text-[10px] md:text-xs opacity-70 leading-relaxed">{isPowerOf2(wizardGroupCount * qualifiersPerGroup) ? "Success! This creates a balanced bracket." : "Warning: Not a power-of-2. Some players will have byes."}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4">
                <button onClick={() => setFixtureWizardStep(2)} className="flex-1 px-5 md:px-8 py-3 md:py-4 bg-white/5 text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl border border-white/10 hover:bg-white/10 transition-all">Back</button>
                <button onClick={finalizeToStep3} className="flex-[2] px-5 md:px-8 py-3 md:py-4 bg-primary text-background-dark font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-primary/10">Continue</button>
              </div>
            </div>
          )}

          {fixtureWizardStep === 3 && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
                <div className="text-center md:text-left space-y-1 md:space-y-2">
                  <h4 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Draw Engine</h4>
                  <p className="text-white/40 text-[10px] md:text-sm">Assign players or use randomize.</p>
                </div>
                <button onClick={handleRandomizeDraw} disabled={isDrawing || unassignedPlayers.length === 0} className={`w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${isDrawing ? 'bg-white/10 text-white/40' : 'bg-primary text-background-dark hover:scale-105 shadow-lg shadow-primary/10'}`}>
                  {isDrawing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Shuffling... </> : <><Dices className="w-4 h-4 md:w-5 md:h-5" /> Random Draw</>}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
                <div className="lg:col-span-1 space-y-3">
                  <div className="flex items-center justify-between px-2"><h5 className="text-[9px] font-black text-white/40 uppercase tracking-widest">Available</h5><span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black">{unassignedPlayers.length}</span></div>
                  <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, 'unassigned')} className="bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-3xl p-3 md:p-4 min-h-[150px] md:min-h-[500px] max-h-[150px] md:max-h-[500px] overflow-y-auto custom-scrollbar space-y-2">
                    {unassignedPlayers.map((player) => (
                      <div key={player.id} draggable onDragStart={(e) => onDragStart(e, player, 'unassigned')} className="p-3 bg-background-dark/80 border border-white/5 rounded-xl cursor-grab hover:border-primary/50 transition-all flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-black text-white/40 uppercase">{player.name.charAt(0)}</div>
                        <span className="text-[10px] md:text-xs font-black text-white italic truncate uppercase">{player.name}</span>
                      </div>
                    ))}
                    {unassignedPlayers.length === 0 && <div className="h-full flex flex-col items-center justify-center text-white/10 py-4"><span className="text-[8px] font-black uppercase tracking-widest">All Assigned</span></div>}
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {Object.entries(groupAssignments).map(([groupKey, groupPlayers]) => (
                      <div key={groupKey} className="space-y-3">
                        <div className="flex items-center justify-between px-2"><h5 className="text-[11px] font-black text-primary uppercase tracking-widest italic">{selectedFormat === 'knockout' ? 'Positions' : `Group ${groupKey}`}</h5></div>
                        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, groupKey)} className="bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-5 min-h-[120px] space-y-2 transition-all hover:bg-white/[0.04]">
                          {(groupPlayers as any[]).map((player, idx) => (
                            <div key={player.id} draggable onDragStart={(e) => onDragStart(e, player, groupKey)} className="p-3 bg-background-dark/50 border border-white/5 rounded-xl flex items-center justify-between cursor-grab hover:border-primary/30 transition-all">
                              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-black text-primary">{idx + 1}</div><span className="text-[10px] md:text-xs font-black text-white uppercase italic truncate max-w-[120px]">{player.name}</span></div>
                              <button onClick={() => { const newUnassigned = [...unassignedPlayers, player]; const newAssignments = { ...groupAssignments }; newAssignments[groupKey] = (newAssignments[groupKey] as any[]).filter(p => p.id !== player.id); setUnassignedPlayers(newUnassigned); setGroupAssignments(newAssignments); }} className="p-1 text-white/20 hover:text-secondary"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ))}
                          {(groupPlayers as any[]).length === 0 && <div className="h-full flex flex-col items-center justify-center text-white/10 py-4"><span className="text-[9px] font-black uppercase tracking-widest">Drop here</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4 pt-4 md:pt-8 border-t border-white/10">
                <button onClick={() => setFixtureWizardStep(2)} className="flex-1 px-5 md:px-8 py-3 md:py-4 bg-white/5 text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl border border-white/10">Back</button>
                <button onClick={() => { if (unassignedPlayers.length > 0 && !window.confirm(`Warning: ${unassignedPlayers.length} unassigned players. Continue?`)) return; setFixtureWizardStep(4); }} className="flex-[2] px-5 md:px-8 py-3 md:py-4 bg-primary text-background-dark font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:brightness-110 transition-all">Preview Fixures</button>
              </div>
            </div>
          )}

          {fixtureWizardStep === 4 && (
            <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-1 md:space-y-2">
                <h4 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Preview Matrix</h4>
                <p className="text-white/40 text-[10px] md:text-sm">Final review of pairings.</p>
              </div>

              {drawnMatchCount < wizardMatches.length && (
                <div className="flex flex-col items-center justify-center p-5 md:p-8 bg-primary/5 rounded-2xl md:rounded-3xl border border-primary/20 relative overflow-hidden">
                  <h4 className="text-[11px] md:text-sm font-black italic uppercase tracking-widest text-primary mb-4 md:mb-6">Match {drawnMatchCount + 1} of {wizardMatches.length}</h4>
                  {isMatchDrawing || shuffleNames.home !== "SHUFFLING" ? (
                    <div className="flex items-center justify-center gap-3 md:gap-6 w-full max-w-lg">
                      <div className={`flex-1 h-14 md:h-20 bg-background-dark/80 border ${isMatchDrawing ? 'border-primary/50' : 'border-emerald-500/50 bg-emerald-500/10'} rounded-xl flex items-center justify-center px-3 overflow-hidden transition-all`}><span className="font-black italic text-sm md:text-xl uppercase tracking-tighter truncate text-white">{shuffleNames.home}</span></div>
                      <div className="text-primary font-black text-sm md:text-xl italic">VS</div>
                      <div className={`flex-1 h-14 md:h-20 bg-background-dark/80 border ${isMatchDrawing ? 'border-primary/50' : 'border-emerald-500/50 bg-emerald-500/10'} rounded-xl flex items-center justify-center px-3 overflow-hidden transition-all`}><span className="font-black italic text-sm md:text-xl uppercase tracking-tighter truncate text-white">{shuffleNames.away}</span></div>
                    </div>
                  ) : (
                    <div className="flex gap-2 md:gap-4">
                      <button onClick={() => { const nextMatch = wizardMatches[drawnMatchCount]; setIsMatchDrawing(true); setTimeout(() => { setIsMatchDrawing(false); setShuffleNames({ home: nextMatch.homePlayerName, away: nextMatch.awayPlayerName }); setTimeout(() => { setDrawnMatchCount(prev => prev + 1); setShuffleNames({ home: "SHUFFLING", away: "SHUFFLING" }); }, 1500); }, 1500); }} className="px-6 md:px-8 py-2 md:py-3 bg-secondary text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-lg md:rounded-xl hover:brightness-110">Draw Match</button>
                      <button onClick={() => setDrawnMatchCount(wizardMatches.length)} className="px-4 md:px-6 py-2 md:py-3 bg-white/5 text-white/50 text-[9px] md:text-[10px] font-bold uppercase rounded-lg md:rounded-xl border border-white/10">Skip</button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden max-h-[350px] md:max-h-[500px] flex flex-col">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-[8px] md:text-[10px] text-white/30 uppercase tracking-widest">
                      <tr><th className="px-4 md:px-8 py-3 md:py-4 font-black">#</th><th className="px-4 md:px-8 py-3 md:py-4 font-black text-right">Home</th><th className="px-4 md:px-8 py-3 md:py-4 font-black text-center">VS</th><th className="px-4 md:px-8 py-3 md:py-4 font-black">Away</th><th className="px-4 md:px-8 py-3 md:py-4 font-black text-center">X</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {wizardMatches.slice(0, Math.max(drawnMatchCount, wizardMatches.length)).map((match, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="px-4 md:px-8 py-3 text-[10px] font-bold text-white/20">{idx + 1}</td>
                          <td className="px-4 md:px-8 py-3 text-right">
                            <select className="bg-transparent text-[10px] md:text-xs font-black text-white italic outline-none cursor-pointer text-right appearance-none" value={match.homePlayerId} onChange={(e) => { const targetId = e.target.value; const targetName = targetId === "bye" ? "BYE" : players.find(p => p.id === targetId)?.name || "Unknown"; const newMatches = [...wizardMatches]; newMatches[idx] = { ...match, homePlayerId: targetId, homePlayerName: targetName }; setWizardMatches(newMatches); }}>
                              {players.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id} className="bg-background-dark">{p.name}</option>)}
                              <option value="bye" className="bg-background-dark">BYE</option>
                            </select>
                          </td>
                          <td className="px-4 md:px-8 py-3 text-center text-[9px] font-black text-white/5">VS</td>
                          <td className="px-4 md:px-8 py-3">
                            <select className="bg-transparent text-[10px] md:text-xs font-black text-white italic outline-none cursor-pointer appearance-none" value={match.awayPlayerId} onChange={(e) => { const targetId = e.target.value; const targetName = targetId === "bye" ? "BYE" : players.find(p => p.id === targetId)?.name || "Unknown"; const newMatches = [...wizardMatches]; newMatches[idx] = { ...match, awayPlayerId: targetId, awayPlayerName: targetName }; setWizardMatches(newMatches); }}>
                              {players.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id} className="bg-background-dark">{p.name}</option>)}
                              <option value="bye" className="bg-background-dark">BYE</option>
                            </select>
                          </td>
                          <td className="px-4 md:px-8 py-3 text-center"><button onClick={() => { const newMatches = wizardMatches.filter((_, i) => i !== idx); setWizardMatches(newMatches); if (drawnMatchCount > newMatches.length) setDrawnMatchCount(newMatches.length); }} className="p-1 text-white/10 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4">
                <button onClick={() => setFixtureWizardStep(3)} className="flex-1 px-5 md:px-8 py-3 md:py-4 bg-white/5 text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl border border-white/10">Back</button>
                <button onClick={finalizeTournament} className="flex-[2] px-5 md:px-8 py-3 md:py-4 bg-primary text-background-dark font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl md:rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-primary/10">Finalize & Deploy</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixtureWizard;
