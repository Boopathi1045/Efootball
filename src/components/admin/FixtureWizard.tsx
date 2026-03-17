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
    <div className="fixed inset-0 z-[100] bg-background-dark/95 backdrop-blur-xl flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white/5 border border-white/10 rounded-[32px] overflow-hidden flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Wizard Header */}
        <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              <RefreshCw className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Fixture Wizard</h3>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map(step => (
                  <div key={step} className={`h-1 rounded-full transition-all duration-500 ${step <= fixtureWizardStep ? 'w-8 bg-primary shadow-[0_0_10px_rgba(15,164,175,0.5)]' : 'w-4 bg-white/10'}`} />
                ))}
                <span className="text-[10px] font-black uppercase text-primary ml-2">Step {fixtureWizardStep} of 5</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {fixtureWizardStep === 1 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h4 className="text-3xl font-black italic uppercase italic tracking-tighter text-white">Select Tournament Format</h4>
                <p className="text-white/40 text-sm">Choose how the matches will be structured for this tournament.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'knockout', title: 'Single Elimination', desc: 'Knockout only. Lose once and you\'re out.', icon: <Trash2 className="w-8 h-8" />, color: 'from-orange-500/20 to-red-500/20' },
                  { id: 'round_robin', title: 'Round Robin', desc: 'One big league. Everyone plays everyone.', icon: <Users className="w-8 h-8" />, color: 'from-blue-500/20 to-indigo-500/20' },
                  { id: 'hybrid', title: 'Hybrid Stage', desc: 'Group stages followed by Knockouts.', icon: <Trophy className="w-8 h-8" />, color: 'from-emerald-500/20 to-teal-500/20' }
                ].map((format) => (
                  <button
                    key={format.id}
                    onClick={() => { setSelectedFormat(format.id); setFixtureWizardStep(2); }}
                    className={`relative group p-8 rounded-3xl border transition-all duration-300 text-left overflow-hidden bg-gradient-to-br ${format.color} ${selectedFormat === format.id ? 'border-primary ring-2 ring-primary/20 scale-[1.02]' : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'}`}
                  >
                    <div className="relative z-10 space-y-4">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${selectedFormat === format.id ? 'bg-primary text-background-dark scale-110' : 'bg-white/5 text-white group-hover:bg-white/10'}`}>
                        {format.icon}
                      </div>
                      <div>
                        <h5 className="text-xl font-black italic uppercase tracking-tighter text-white">{format.title}</h5>
                        <p className="text-white/40 text-sm mt-1 leading-relaxed">{format.desc}</p>
                      </div>
                    </div>
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {fixtureWizardStep === 2 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <div className="text-center space-y-2">
                <h4 className="text-3xl font-black italic uppercase italic tracking-tighter text-white">Dynamic Setup</h4>
                <p className="text-white/40 text-sm leading-relaxed">Configuring the details for your <span className="text-primary font-bold">{selectedFormat?.replace('_', ' ')}</span> tournament.</p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6">
                {(selectedFormat === 'hybrid' || selectedFormat === 'round_robin') && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Number of Groups</label>
                    <div className="relative flex items-center justify-center max-w-xs">
                      <button onClick={() => setWizardGroupCount(Math.max(1, wizardGroupCount - 1))} className="absolute left-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors z-10">-</button>
                      <input type="number" min="1" max="32" value={wizardGroupCount} onChange={(e) => setWizardGroupCount(parseInt(e.target.value) || 1)} className="w-full bg-background-dark/50 border border-primary/30 rounded-full px-12 py-4 text-center text-4xl font-black italic text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner" />
                      <button onClick={() => setWizardGroupCount(wizardGroupCount + 1)} className="absolute right-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors z-10">+</button>
                    </div>
                  </div>
                )}

                {(selectedFormat === 'round_robin' || selectedFormat === 'hybrid') && (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Match Cycle</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'single', title: 'Single Round', desc: 'Play once' },
                        { id: 'double', title: 'Double Round', desc: 'Home & Away' }
                      ].map(type => (
                        <button key={type.id} onClick={() => setRoundRobinType(type.id as any)} className={`p-4 rounded-2xl border transition-all ${roundRobinType === type.id ? 'bg-primary border-primary text-background-dark' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}>
                          <div className="text-sm font-black italic uppercase">{type.title}</div>
                          <div className="text-[9px] font-bold uppercase tracking-widest mt-1">{type.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFormat === 'knockout' && (
                  <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-4">
                    <div className="flex items-center gap-3 text-orange-500">
                      <Settings className="w-5 h-5" />
                      <h6 className="font-bold uppercase text-xs tracking-wider">Bracket Normalization</h6>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-white/60 leading-relaxed">Players: <span className="text-white font-bold">{players.filter(p => p.status === 'approved').length}</span></p>
                      {(() => {
                        const pCount = players.filter(p => p.status === 'approved').length;
                        const nearest = getNearestPowerOf2(pCount);
                        const byes = nearest - pCount;
                        return (
                          <div className="p-4 bg-background-dark/50 rounded-xl border border-white/5">
                            <div className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Calculation</div>
                            <div className="text-xs text-white/40">Target Bracket: <span className="text-white font-bold">{nearest}</span> slots<br />Byes needed: <span className="text-secondary font-black italic">{byes}</span></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                  <div className="flex items-center gap-3 text-primary"><Users className="w-5 h-5" /><h6 className="font-bold uppercase text-xs tracking-wider">Participation Summary</h6></div>
                  <p className="text-sm text-white/60">Total Verified Players: <span className="text-white font-bold">{players.filter(p => p.status === 'approved').length}</span></p>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setFixtureWizardStep(1)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">Back</button>
                <button onClick={finalizeWizardStep2} className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]">Continue to {selectedFormat === 'hybrid' ? 'Qualification Setup' : 'Draw Engine'}</button>
              </div>
            </div>
          )}

          {fixtureWizardStep === 2.5 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
              <div className="text-center space-y-2">
                <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white">Qualification Setup</h4>
                <p className="text-white/40 text-sm">Choose how many players should lead to the next round.</p>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-2 block">Target Qualifiers for Knockout</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[2, 4, 8, 16].map(num => (
                      <button key={num} onClick={() => { setTargetQualifiers(num); setQualifiersPerGroup(calculateQualifiersPerGroup(wizardGroupCount, num)); }} className={`p-6 rounded-2xl border transition-all ${targetQualifiers === num ? 'bg-primary border-primary text-background-dark' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}>
                        <div className="text-2xl font-black italic">{num}</div>
                        <div className="text-[9px] font-black uppercase tracking-widest mt-1">{num === 2 ? 'Final' : num === 4 ? 'Semi-Finals' : num === 8 ? 'Quarter-Finals' : 'Round of 16'}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                  <div className="flex items-center gap-3 text-primary"><Check className="w-5 h-5" /><h6 className="font-bold uppercase text-xs tracking-wider">Automated Logic Verification</h6></div>
                  <div className="space-y-3">
                    <p className="text-sm text-white/60">Groups: <span className="text-white font-bold">{wizardGroupCount}</span> | Qualifiers per Group: <span className="text-white font-bold">{qualifiersPerGroup}</span></p>
                    <div className={`p-4 rounded-xl border ${isPowerOf2(wizardGroupCount * qualifiersPerGroup) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      <div className="flex items-center gap-2 mb-1">{isPowerOf2(wizardGroupCount * qualifiersPerGroup) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}<span className="text-[10px] font-black uppercase tracking-widest">Logic Check: {wizardGroupCount * qualifiersPerGroup} Total Qualifiers</span></div>
                      <p className="text-xs opacity-70">{isPowerOf2(wizardGroupCount * qualifiersPerGroup) ? "Perfect! This creates a clean power-of-2 bracket." : `WARNING: ${wizardGroupCount * qualifiersPerGroup} is not a power of 2 (2, 4, 8, 16). Please adjust groups or qualifiers.`}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setFixtureWizardStep(2)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">Back</button>
                <button onClick={finalizeToStep3} className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]">Continue to Draw Engine</button>
              </div>
            </div>
          )}

          {fixtureWizardStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-left space-y-2">
                  <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white">Draw Engine</h4>
                  <p className="text-white/40 text-sm">Assign players to groups or bracket slots. Randomize or drag manually.</p>
                </div>
                <button onClick={handleRandomizeDraw} disabled={isDrawing || unassignedPlayers.length === 0} className={`px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-3 ${isDrawing ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-primary text-background-dark hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(15,164,175,0.3)]'}`}>
                  {isDrawing ? <><RefreshCw className="w-5 h-5 animate-spin" /> Shuffling Balls... </> : <><Dices className="w-5 h-5" /> UCL Random Draw</>}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-4">
                  <div className="flex items-center justify-between px-2"><h5 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Approved Players</h5><span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-md font-black">{unassignedPlayers.length}</span></div>
                  <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, 'unassigned')} className="bg-white/[0.02] border border-white/10 rounded-3xl p-4 min-h-[600px] max-h-[600px] overflow-y-auto custom-scrollbar space-y-2">
                    {unassignedPlayers.map((player) => (
                      <div key={player.id} draggable onDragStart={(e) => onDragStart(e, player, 'unassigned')} className="p-4 bg-background-dark/80 border border-white/5 rounded-2xl cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all group">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">{player.name.charAt(0)}</div><span className="text-xs font-black text-white italic truncate uppercase">{player.name}</span></div>
                      </div>
                    ))}
                    {unassignedPlayers.length === 0 && <div className="h-full flex flex-col items-center justify-center text-white/10 py-12 text-center"><CheckCircle2 className="w-8 h-8 mb-2 opacity-20" /><span className="text-[10px] font-black uppercase tracking-widest">All Players Assigned</span></div>}
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {Object.entries(groupAssignments).map(([groupKey, groupPlayers]) => (
                      <div key={groupKey} className="space-y-4">
                        <div className="flex items-center justify-between px-2"><h5 className="text-sm font-black text-primary uppercase tracking-widest italic">{selectedFormat === 'knockout' ? 'Bracket Positions' : `Group ${groupKey}`}</h5><span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md font-bold">{(groupPlayers as any[]).length} Players</span></div>
                        <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, groupKey)} className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 min-h-[300px] space-y-3 transition-all hover:bg-white/[0.04] hover:border-primary/20">
                          {(groupPlayers as any[]).map((player) => (
                            <div key={player.id} draggable onDragStart={(e) => onDragStart(e, player, groupKey)} className="p-4 bg-background-dark/50 border border-white/5 rounded-2xl group flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all">
                              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">{(groupPlayers as any[]).indexOf(player) + 1}</div><div className="flex flex-col"><span className="text-xs font-black text-white italic truncate uppercase">{player.name}</span><span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">SEED {(groupPlayers as any[]).indexOf(player) + 1}</span></div></div>
                              <button onClick={() => { const newUnassigned = [...unassignedPlayers, player]; const newAssignments = { ...groupAssignments }; newAssignments[groupKey] = (newAssignments[groupKey] as any[]).filter(p => p.id !== player.id); setUnassignedPlayers(newUnassigned); setGroupAssignments(newAssignments); }} className="p-2 opacity-0 group-hover:opacity-100 hover:text-secondary transition-all"><X className="w-4 h-4" /></button>
                            </div>
                          ))}
                          {(groupPlayers as any[]).length === 0 && <div className="h-full flex flex-col items-center justify-center text-white/10 py-12"><PlusCircle className="w-8 h-8 mb-2 opacity-10" /><span className="text-[10px] font-black uppercase tracking-widest text-center">Drag players here</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8 border-t border-white/10">
                <button onClick={() => setFixtureWizardStep(2)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">Back</button>
                <button onClick={() => { if (unassignedPlayers.length > 0 && !window.confirm(`There are still ${unassignedPlayers.length} unassigned players. Proceed?`)) return; setFixtureWizardStep(4); }} className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]">Preview Fixture Matrix</button>
              </div>
            </div>
          )}

          {fixtureWizardStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white">Fixture Matrix</h4>
                <p className="text-white/40 text-sm">Review pairings. Use the dropdowns for manual interception.</p>
              </div>

              {drawnMatchCount < wizardMatches.length && (
                <div className="flex flex-col items-center justify-center p-8 glass-panel rounded-3xl border border-primary/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full"></div>
                  <h4 className="text-lg font-black italic uppercase tracking-widest text-primary z-10 mb-6">Drawing Match {drawnMatchCount + 1} of {wizardMatches.length}</h4>
                  {isMatchDrawing || shuffleNames.home !== "SHUFFLING" ? (
                    <div className="flex flex-col items-center justify-center gap-6 z-10 mb-2"><div className="flex items-center justify-center gap-6"><div className={`w-48 h-20 bg-background-dark border ${isMatchDrawing ? 'border-primary/50 text-white/50' : 'border-emerald-500/50 text-white bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]'} rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all`}><span className="font-black italic text-xl uppercase tracking-wider truncate px-4">{shuffleNames.home}</span></div><div className="text-primary font-black text-2xl tracking-[0.2em] italic">VS</div><div className={`w-48 h-20 bg-background-dark border ${isMatchDrawing ? 'border-primary/50 text-white/50' : 'border-emerald-500/50 text-white bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]'} rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all`}><span className="font-black italic text-xl uppercase tracking-wider truncate px-4">{shuffleNames.away}</span></div></div></div>
                  ) : (
                    <div className="flex gap-4 z-10">
                      <button onClick={() => { const nextMatch = wizardMatches[drawnMatchCount]; setIsMatchDrawing(true); setTimeout(() => { setIsMatchDrawing(false); setShuffleNames({ home: nextMatch.homePlayerName, away: nextMatch.awayPlayerName }); setTimeout(() => { setDrawnMatchCount(prev => prev + 1); setShuffleNames({ home: "SHUFFLING", away: "SHUFFLING" }); }, 1500); }, 1500); }} className="px-8 py-3 bg-secondary text-white font-black uppercase text-sm tracking-widest rounded-xl hover:brightness-110 transition-all shadow-[0_0_15px_rgba(150,71,52,0.4)]">Draw Next Match</button>
                      <button onClick={() => setDrawnMatchCount(wizardMatches.length)} className="px-6 py-3 bg-white/5 text-white/50 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/10">Skip Animation</button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden max-h-[500px] flex flex-col">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="bg-white/[0.02] text-[10px] text-white/30 uppercase tracking-[0.2em]">
                      <tr><th className="px-8 py-4 font-black">#</th><th className="px-8 py-4 font-black">Round</th><th className="px-8 py-4 font-black text-right">Home Player</th><th className="px-8 py-4 font-black text-center">VS</th><th className="px-8 py-4 font-black">Away Player</th><th className="px-8 py-4 font-black text-center">Actions</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {wizardMatches.slice(0, Math.max(drawnMatchCount, wizardMatches.length)).map((match, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors group animate-in slide-in-from-left-4 fade-in duration-300">
                          <td className="px-8 py-4 text-xs font-bold text-white/20">{match.matchIndex || idx + 1}</td>
                          <td className="px-8 py-4"><input type="text" className="bg-transparent text-[10px] font-black uppercase text-primary tracking-wider outline-none border-b border-transparent focus:border-primary/30 w-24" value={match.round} onChange={(e) => { const newMatches = [...wizardMatches]; newMatches[idx] = { ...match, round: e.target.value, stage: e.target.value }; setWizardMatches(newMatches); }} /></td>
                          <td className="px-8 py-4 text-right">
                            <select className="bg-transparent text-sm font-bold text-white/70 italic text-right outline-none cursor-pointer hover:text-white" value={match.homePlayerId} onChange={(e) => { const targetId = e.target.value; const targetName = targetId === "bye" ? "BYE" : players.find(p => p.id === targetId)?.name || "Unknown"; const newMatches = [...wizardMatches]; newMatches[idx] = { ...match, homePlayerId: targetId, homePlayerName: targetName }; setWizardMatches(newMatches); }}>
                              {players.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id} className="bg-background-dark">{p.name}</option>)}
                              <option value="bye" className="bg-background-dark">BYE</option>
                            </select>
                          </td>
                          <td className="px-8 py-4 text-center text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">VS</td>
                          <td className="px-8 py-4">
                            <select className="bg-transparent text-sm font-bold text-white/70 italic outline-none cursor-pointer hover:text-white" value={match.awayPlayerId} onChange={(e) => { const targetId = e.target.value; const targetName = targetId === "bye" ? "BYE" : players.find(p => p.id === targetId)?.name || "Unknown"; const newMatches = [...wizardMatches]; newMatches[idx] = { ...match, awayPlayerId: targetId, awayPlayerName: targetName }; setWizardMatches(newMatches); }}>
                              {players.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id} className="bg-background-dark">{p.name}</option>)}
                              <option value="bye" className="bg-background-dark">BYE</option>
                            </select>
                          </td>
                          <td className="px-8 py-4 text-center"><button onClick={() => { const newMatches = wizardMatches.filter((_, i) => i !== idx); newMatches.forEach((m, i) => m.matchIndex = i + 1); setWizardMatches(newMatches); if (drawnMatchCount > newMatches.length) setDrawnMatchCount(newMatches.length); }} className="p-2 text-white/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setFixtureWizardStep(3)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">Back</button>
                <button onClick={finalizeTournament} className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]">Finalize & Deploy Tournament</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FixtureWizard;
