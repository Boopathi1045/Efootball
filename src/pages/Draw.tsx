import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Trophy, RefreshCw, ArrowRightLeft, Play, Shield, Settings, Check } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export default function Draw() {
  const { id: urlId } = useParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawnPlayer, setDrawnPlayer] = useState<any>(null);
  const [showGroupSetup, setShowGroupSetup] = useState(true);
  const [setupGroupCount, setSetupGroupCount] = useState(2);
  const [drawFinalized, setDrawFinalized] = useState(false);

  useEffect(() => {
    if (activeTournament?.groupCount) {
      setSetupGroupCount(activeTournament.groupCount);
    }
  }, [activeTournament?.groupCount]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user;
      if (u && (u.email === "rboopathi1045@gmail.com" || u.email === "admin@efootball.com")) {
        setIsAdmin(true);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u && (u.email === "rboopathi1045@gmail.com" || u.email === "admin@efootball.com")) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    // Fetch tournaments
    const fetchTournaments = async () => {
      let query = supabase.from('tournaments').select('*');
      if (urlId) {
        const decodedUrl = decodeURIComponent(urlId);
        query = query.or(`id.eq.${decodedUrl},name.eq.${decodedUrl}`);
      } else {
        query = query.eq('"isHidden"', false).order('"createdAt"', { ascending: false }).limit(1);
      }
      
      const { data } = await query;
      if (data && data.length > 0) {
        setActiveTournament(data[0]);
      }
    };

    fetchTournaments();

    // Subscribe to tournaments
    const tourneyChannel = supabase.channel('draw_tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchTournaments)
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(tourneyChannel);
    };
  }, []);

  useEffect(() => {
    if (!activeTournament) return;
    
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('"tournamentId"', activeTournament.id)
        .eq('status', 'approved');
      if (data) setPlayers(data);
    };

    fetchPlayers();

    const playerChannel = supabase.channel('draw_players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `"tournamentId"=eq.${activeTournament.id}` }, fetchPlayers)
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [activeTournament?.id]);

  const groupCount = activeTournament?.groupCount || 2;
  const groupKeys = Array.from({ length: groupCount }, (_, i) => i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)) : String.fromCharCode(65 + i));
  const unassignedPlayers = players.filter(p => p.group === "None" || !p.group);

  const drawNext = async () => {
    if (unassignedPlayers.length === 0) return;
    
    setDrawing(true);
    // Simulate dramatic delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const randomIdx = Math.floor(Math.random() * unassignedPlayers.length);
    const selected = unassignedPlayers[randomIdx];
    
    // Find group with least players
    let targetGroup = "A";
    let minCount = Infinity;

    groupKeys.forEach(key => {
      const count = players.filter(p => p.group === key).length;
      if (count < minCount) {
        minCount = count;
        targetGroup = key;
      }
    });
    
    setDrawnPlayer({ ...selected, targetGroup });
    setDrawing(false);

    // Optimistic update of local players list
    setPlayers(prev => prev.map(p => p.id === selected.id ? { ...p, group: targetGroup } : p));

    // Update DB
    if (isAdmin) {
      await supabase.from('players').update({ group: targetGroup }).eq('id', selected.id);
    }
  };

  const resetDraw = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to reset the draw? All players will be unassigned.")) return;
    
    // Optimistic reset
    setPlayers(prev => prev.map(p => ({ ...p, group: 'None' })));
    setDrawnPlayer(null);

    const { error } = await supabase
      .from('players')
      .update({ "group": 'None' })
      .eq('"tournamentId"', activeTournament.id);
      
    if (error) {
      console.error("Reset draw error:", error);
      alert("Failed to reset draw.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-primary/10 px-6 py-4 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Trophy className="text-primary w-8 h-8" />
          <h2 className="text-xl font-bold tracking-tight">eFootball <span className="text-primary uppercase italic">{activeTournament?.name || "Pro Draw"}</span></h2>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <Link to={`/admin/${encodeURIComponent(activeTournament?.name || '')}`} className="text-[10px] md:text-sm font-semibold text-background-light/70 hover:text-background-light transition-colors uppercase">Admin</Link>
          <Link to="/" className="text-[10px] md:text-sm font-semibold text-background-light/70 hover:text-background-light transition-colors uppercase">Hub</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 gap-12 ucl-gradient max-w-[1600px] mx-auto w-full">
        {/* Dynamic Groups */}
        <div 
          className="grid gap-6 w-full" 
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignContent: 'start' }}
        >
          {groupKeys.map(key => {
            const groupPlayers = players.filter(p => p.group === key);
            return (
              <aside key={key} className="flex flex-col gap-4">
                <div className="glass-panel rounded-xl p-5 flex flex-col h-full border-t-4 border-t-primary">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black italic tracking-widest text-primary uppercase">Group {key}</h3>
                    <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded">{groupPlayers.length} SEEDS</span>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    <AnimatePresence>
                      {groupPlayers.map((p, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={p.id} 
                          className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20 neon-glow"
                        >
                          <span className="text-2xl font-black italic text-primary/40">0{i + 1}</span>
                          <div className="w-10 h-10 rounded bg-surface-dark flex items-center justify-center">
                            <Shield className="text-primary w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold uppercase text-xs truncate">{p.name}</p>
                            <p className="text-[10px] text-primary/70 truncate">ID: {p.efootballId}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {groupPlayers.length < 8 && (
                      <div className="flex items-center gap-4 p-3 rounded-lg border-2 border-dashed border-primary/20 opacity-30">
                        <span className="text-2xl font-black italic text-primary/10">0{groupPlayers.length + 1}</span>
                        <div className="w-10 h-10 rounded bg-primary/5 flex items-center justify-center border border-primary/5">
                          <span className="text-primary/10 text-xl">+</span>
                        </div>
                        <p className="text-[10px] font-medium tracking-wider text-primary/20 uppercase">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              </aside>
            );
          })}
        </div>

        {/* Center Stage */}
        <section className="flex-[2] flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px] relative py-8 md:py-0">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px]"></div>
          </div>

          {showGroupSetup ? (
            <div className="absolute inset-0 z-[100] bg-background-dark/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
              <div className="max-w-xl w-full space-y-8 text-center">
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary/20">
                  <Settings className="w-10 h-10 text-primary animate-spin-slow" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl md:text-4xl font-black italic uppercase italic tracking-tighter text-white">Live Draw Setup</h3>
                  <p className="text-white/40 text-[10px] md:text-sm leading-relaxed uppercase tracking-widest font-bold">Configure groups for <span className="text-primary">{activeTournament?.name}</span></p>
                </div>
                
                <div className="flex flex-col gap-6 pt-4 max-w-xs mx-auto">
                  <div className="relative flex items-center justify-center">
                    <button 
                      onClick={() => setSetupGroupCount(Math.max(1, setupGroupCount - 1))}
                      className="absolute left-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors"
                    >-</button>
                    <input
                      type="number"
                      min="1"
                      max="32"
                      value={setupGroupCount}
                      onChange={e => setSetupGroupCount(parseInt(e.target.value) || 1)}
                      className="w-full bg-background-dark/50 border border-primary/30 rounded-full px-12 py-3 md:py-4 text-center text-3xl md:text-5xl font-black italic text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                    />
                    <button 
                      onClick={() => setSetupGroupCount(setupGroupCount + 1)}
                      className="absolute right-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors"
                    >+</button>
                  </div>
                  <button 
                    onClick={async () => {
                      if (isAdmin) {
                        await supabase.from('tournaments').update({ groupCount: setupGroupCount }).eq('id', activeTournament.id);
                      }
                      setActiveTournament({...activeTournament, groupCount: setupGroupCount});
                      setShowGroupSetup(false);
                    }}
                    className="w-full bg-primary hover:brightness-110 text-background-dark font-black px-6 py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                  >
                    START LIVE DRAW
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="relative z-10 group cursor-pointer mb-12" 
               onClick={() => !drawing && unassignedPlayers.length > 0 && drawNext()}
            >
              <div className="absolute inset-0 bg-primary/40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <motion.div 
                animate={{ rotate: drawing ? 360 : 0, scale: drawing ? 0.95 : 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.5, ease: "easeInOut", rotate: { duration: 2, repeat: drawing ? Infinity : 0 } }}
                className="relative w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-primary/30 bg-background-dark flex items-center justify-center shadow-[0_0_80px_rgba(0,242,255,0.3)] overflow-hidden"
              >
                <Trophy className={`w-16 h-16 md:w-24 md:h-24 ${drawing ? 'text-primary animate-pulse' : 'text-primary/80'} drop-shadow-[0_0_15px_rgba(0,242,255,0.8)]`} />
                <div className="absolute inset-0 border-8 border-primary/5 rounded-full border-t-primary/40 border-b-primary/40 animate-spin" style={{ animationDuration: '4s' }}></div>
                <div className="absolute inset-4 border-4 border-primary/10 rounded-full border-l-primary/30 border-r-primary/30 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
              </motion.div>
            </motion.div>
          )}

          <div className="text-center z-10 h-32">
            <AnimatePresence mode="wait">
              {drawnPlayer ? (
                <motion.div 
                  key={drawnPlayer.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  className="bg-primary/10 border border-primary/30 p-6 rounded-2xl neon-glow backdrop-blur-md"
                >
                  <p className="text-primary text-sm font-bold tracking-[0.3em] uppercase mb-2">Drawn Player</p>
                  <h2 className="text-3xl font-black italic uppercase">{drawnPlayer.name}</h2>
                  <p className="text-background-light/80 mt-2">Assigned to <span className="text-secondary font-bold">Group {drawnPlayer.targetGroup}</span></p>
                </motion.div>
              ) : (
                <motion.div 
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {unassignedPlayers.length === 0 && players.length > 0 ? (
                    <div className="space-y-6">
                      <div className="text-emerald-500 font-black uppercase italic tracking-widest text-lg animate-bounce">Draw Complete!</div>
                      {drawFinalized ? (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-sm font-bold animate-in zoom-in duration-300">
                          ✓ All Seeds Finalized and Saved
                        </div>
                      ) : (
                        isAdmin && (
                          <button 
                            onClick={() => {
                              if (window.confirm("Confirm this draw? This will finalize the group assignments.")) {
                                setDrawFinalized(true);
                                alert("Draw finalized! Groups are now live.");
                              }
                            }}
                            className="bg-emerald-500 hover:brightness-110 text-background-dark font-black px-10 py-4 rounded-xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                          >
                            <Check className="w-6 h-6" />
                            CONFIRM & FINALIZE DRAW
                          </button>
                        )
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-primary text-sm font-bold tracking-[0.3em] uppercase mb-4 opacity-80">Ready to Reveal</p>
                      <p className="text-background-light/70 text-sm mb-6">{unassignedPlayers.length} players remaining</p>
                      {isAdmin && (
                        <button 
                          onClick={drawNext}
                          disabled={drawing || unassignedPlayers.length === 0}
                          className="bg-secondary hover:brightness-110 text-white font-black px-10 py-4 rounded-xl flex items-center gap-3 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(150,71,52,0.4)] disabled:opacity-50 disabled:hover:scale-100 border border-secondary/50"
                        >
                          <Play className="w-6 h-6 fill-current" />
                          DRAW NEXT SEED
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAdmin && (
            <div className="absolute bottom-0 flex gap-4 glass-panel px-6 py-3 rounded-full border border-primary/20">
              <button onClick={resetDraw} className="flex items-center gap-2 text-xs font-bold text-background-light/50 hover:text-background-light transition-colors">
                <RefreshCw className="w-4 h-4" /> RESET DRAW
              </button>
              <div className="w-[1px] h-4 bg-primary/20"></div>
              <button className="flex items-center gap-2 text-xs font-bold text-background-light/50 hover:text-background-light transition-colors">
                <ArrowRightLeft className="w-4 h-4" /> MANUAL SWAP
              </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
