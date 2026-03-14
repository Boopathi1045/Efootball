import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc, writeBatch, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Trophy, RefreshCw, ArrowRightLeft, Play, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export default function Draw() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawnPlayer, setDrawnPlayer] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (user.email === "rboopathi1045@gmail.com") {
          setIsAdmin(true);
        } else {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            setIsAdmin(userDoc.exists() && userDoc.data().role === "admin");
          } catch (e) {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });

    const unsubscribePlayers = onSnapshot(query(collection(db, "players"), where("status", "==", "approved")), (snapshot) => {
      setPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubscribeAuth();
      unsubscribePlayers();
    };
  }, []);

  const unassignedPlayers = players.filter(p => p.group === "None" || !p.group);
  const groupA = players.filter(p => p.group === "A");
  const groupB = players.filter(p => p.group === "B");

  const drawNext = async () => {
    if (unassignedPlayers.length === 0) return;
    
    setDrawing(true);
    // Simulate dramatic delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const randomIdx = Math.floor(Math.random() * unassignedPlayers.length);
    const selected = unassignedPlayers[randomIdx];
    
    // Determine group (max 8 in A, 7 in B for 15 players, but let's just alternate or fill A then B)
    // Let's do simple alternating
    const targetGroup = groupA.length <= groupB.length ? "A" : "B";
    
    setDrawnPlayer({ ...selected, targetGroup });
    setDrawing(false);

    // Update DB
    if (isAdmin) {
      await updateDoc(doc(db, "players", selected.id), { group: targetGroup });
    }
  };

  const resetDraw = async () => {
    if (!isAdmin) return;
    if (!window.confirm("Are you sure you want to reset the draw? All players will be unassigned.")) return;
    
    const batch = writeBatch(db);
    players.forEach(p => {
      batch.update(doc(db, "players", p.id), { group: "None" });
    });
    await batch.commit();
    setDrawnPlayer(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-slate-100 overflow-x-hidden">
      <header className="flex items-center justify-between border-b border-primary/10 px-6 py-4 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Trophy className="text-primary w-8 h-8" />
          <h2 className="text-xl font-bold tracking-tight">eFootball <span className="text-primary uppercase italic">Pro Draw</span></h2>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/admin" className="text-sm font-semibold text-background-light/70 hover:text-background-light transition-colors">Admin Dashboard</Link>
          <Link to="/" className="text-sm font-semibold text-background-light/70 hover:text-background-light transition-colors">Public Hub</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-6 ucl-gradient">
        {/* Group A */}
        <aside className="flex-1 flex flex-col gap-4">
          <div className="glass-panel rounded-xl p-5 flex flex-col h-full border-t-4 border-t-primary">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic tracking-widest text-primary uppercase">Group A</h3>
              <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded">{groupA.length} SEEDS</span>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              <AnimatePresence>
                {groupA.map((p, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={p.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20 neon-glow"
                  >
                    <span className="text-2xl font-black italic text-primary/40">0{i + 1}</span>
                    <div className="w-12 h-12 rounded bg-surface-dark flex items-center justify-center">
                      <Shield className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold uppercase">{p.name}</p>
                      <p className="text-xs text-primary/70">ID: {p.efootballId}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {groupA.length < 8 && (
                <div className="flex items-center gap-4 p-3 rounded-lg border-2 border-dashed border-primary/20 opacity-50">
                  <span className="text-2xl font-black italic text-primary/20">0{groupA.length + 1}</span>
                  <div className="w-12 h-12 rounded bg-primary/5 flex items-center justify-center border border-primary/10">
                    <span className="text-primary/20 text-2xl">+</span>
                  </div>
                  <p className="text-sm font-medium tracking-wider text-primary/30 uppercase">Waiting Draw...</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Center Stage */}
        <section className="flex-[2] flex flex-col items-center justify-center min-h-[500px] relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px]"></div>
          </div>

          <div className="relative z-10 group cursor-pointer mb-12">
            <div className="absolute inset-0 bg-primary/40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <motion.div 
              animate={{ rotate: drawing ? 360 : 0 }}
              transition={{ duration: 2, ease: "easeInOut", repeat: drawing ? Infinity : 0 }}
              className="relative w-72 h-72 rounded-full border-4 border-primary/30 bg-background-dark flex items-center justify-center shadow-[0_0_80px_rgba(0,242,255,0.3)] overflow-hidden"
            >
              <Trophy className="w-32 h-32 text-primary/80 drop-shadow-[0_0_15px_rgba(0,242,255,0.8)]" />
              <div className="absolute inset-0 border-8 border-primary/5 rounded-full border-t-primary/40 border-b-primary/40 animate-spin" style={{ animationDuration: '4s' }}></div>
              <div className="absolute inset-4 border-4 border-primary/10 rounded-full border-l-primary/30 border-r-primary/30 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
            </motion.div>
          </div>

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

        {/* Group B */}
        <aside className="flex-1 flex flex-col gap-4">
          <div className="glass-panel rounded-xl p-5 flex flex-col h-full border-t-4 border-t-primary">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black italic tracking-widest text-primary uppercase">Group B</h3>
              <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded">{groupB.length} SEEDS</span>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              <AnimatePresence>
                {groupB.map((p, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={p.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-primary/5 border border-primary/20 neon-glow"
                  >
                    <span className="text-2xl font-black italic text-primary/40">0{i + 1}</span>
                    <div className="w-12 h-12 rounded bg-surface-dark flex items-center justify-center">
                      <Shield className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold uppercase">{p.name}</p>
                      <p className="text-xs text-primary/70">ID: {p.efootballId}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {groupB.length < 8 && (
                <div className="flex items-center gap-4 p-3 rounded-lg border-2 border-dashed border-primary/20 opacity-50">
                  <span className="text-2xl font-black italic text-primary/20">0{groupB.length + 1}</span>
                  <div className="w-12 h-12 rounded bg-primary/5 flex items-center justify-center border border-primary/10">
                    <span className="text-primary/20 text-2xl">+</span>
                  </div>
                  <p className="text-sm font-medium tracking-wider text-primary/30 uppercase">Waiting Draw...</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
