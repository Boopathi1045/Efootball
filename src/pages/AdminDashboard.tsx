import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, updateDoc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db, auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { Trophy, Settings, Users, Check, X, LogOut, Edit3, Save, RefreshCw, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  
  // Basic mock state for tournament lists
  const [tournaments, setTournaments] = useState<{id: string, name: string, phase: string}[]>([
    { id: "elite-2024", name: "Elite Championship 2024", phase: "registration" }
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState("");

  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ rules: "", activeStage: "registration", entryFee: "", paymentNumber: "", paymentQrUrl: "" });
  const [overrideMode, setOverrideMode] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.email === "rboopathi1045@gmail.com") {
          setIsAdmin(true);
          fetchData();
        } else {
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists() && userDoc.data().role === "admin") {
              setIsAdmin(true);
              fetchData();
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            console.error(e);
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = () => {
    onSnapshot(collection(db, "players"), (snapshot) => {
      setPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    onSnapshot(collection(db, "matches"), (snapshot) => {
      setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setDoc(doc(db, "settings", "global"), { rules: "Default rules", activeStage: "registration" });
      }
    });
  };

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError("Invalid email or password.");
    }
  };

  const handleLogout = () => signOut(auth);

  const updatePlayerStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "players", id), { status });
  };

  const updateSettings = async (field: string, value: string) => {
    await updateDoc(doc(db, "settings", "global"), { [field]: value });
  };

  const updateMatchScore = async (id: string, homeScore: number, awayScore: number) => {
    await updateDoc(doc(db, "matches", id), { homeScore, awayScore, status: "completed" });
    // In a real app, this would also trigger a cloud function to update player points/gd
    // For this prototype, we rely on the admin to manually update points in Override Mode if needed,
    // or we can write a simple client-side logic to update it.
  };

  const updatePlayerStats = async (id: string, field: string, value: number) => {
    await updateDoc(doc(db, "players", id), { [field]: value });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background-dark text-white p-4">
        <Trophy className="w-16 h-16 text-primary mb-6" />
        <h1 className="text-2xl font-bold mb-2 text-background-light">Admin Access Required</h1>
        <p className="text-background-light/70 mb-8 text-center max-w-md">Enter your admin credentials to access the dashboard.</p>
        
        <form onSubmit={handleLogin} className="w-full max-w-sm flex flex-col gap-4 bg-primary/5 p-6 rounded-xl border border-primary/20">
          {loginError && <p className="text-secondary text-sm font-bold text-center bg-secondary/10 py-2 rounded">{loginError}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-background-light/70 font-semibold ml-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-background-dark border border-primary/20 rounded-lg text-white focus:ring-1 focus:ring-secondary outline-none"
              placeholder="admin@efootball.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-background-light/70 font-semibold ml-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-background-dark border border-primary/20 rounded-lg text-white focus:ring-1 focus:ring-secondary outline-none"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="w-full mt-2 px-6 py-3 bg-secondary text-white font-bold rounded-lg hover:brightness-110 transition-all shadow-[0_0_15px_rgba(150,71,52,0.4)]">
            Sign In
          </button>
        </form>
      </div>
    );
  }

  const pendingPlayers = players.filter(p => p.status === "pending");
  const approvedPlayers = players.filter(p => p.status === "approved");

  if (!selectedTournament) {
    return (
      <div className="min-h-screen flex flex-col bg-background-dark text-slate-100">
        <header className="sticky top-0 z-50 border-b border-primary/10 bg-background-dark/80 backdrop-blur-md px-6 py-3">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Trophy className="text-primary w-8 h-8" />
              <h2 className="text-xl font-black tracking-tighter uppercase italic">eFootball Admin</h2>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg glass-panel p-8 rounded-2xl flex flex-col gap-6">
            <h3 className="text-2xl font-black text-white text-center">Select Tournament</h3>
            <p className="text-background-light/70 text-center text-sm">Choose a tournament to manage its phases, players, and fixtures.</p>
            <div className="flex flex-col gap-3">
              {tournaments.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setSelectedTournament(t.id)}
                  className="w-full p-4 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between hover:bg-primary/20 transition-all group"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-lg text-white group-hover:text-primary transition-colors">{t.name}</span>
                    <span className="text-xs text-background-light/50">Pro League</span>
                  </div>
                  <div className="bg-secondary text-white text-[10px] font-black uppercase px-2 py-1 rounded">
                    {t.id === "elite-2024" ? (settings.activeStage || "registration") : t.phase}
                  </div>
                </button>
              ))}
              
              {/* Dummy tournaments for UI demonstration */}
              <button disabled className="w-full p-4 bg-background-dark border border-slate-700/50 rounded-xl flex items-center justify-between opacity-50 cursor-not-allowed">
                <div className="flex flex-col text-left">
                  <span className="font-bold text-lg text-slate-400">Summer Cup 2023</span>
                  <span className="text-xs text-slate-500">Ended</span>
                </div>
              </button>

              {isCreating ? (
                <div className="w-full p-4 border border-primary/50 rounded-xl bg-primary/5 flex flex-col gap-3">
                  <input 
                    type="text" 
                    autoFocus
                    value={newTourneyName}
                    onChange={e => setNewTourneyName(e.target.value)}
                    placeholder="Enter tournament name..."
                    className="w-full bg-background-dark border border-primary/30 rounded-lg p-2 text-white focus:ring-1 focus:ring-primary outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setIsCreating(false); setNewTourneyName(""); }} className="text-xs text-background-light/70 hover:text-white px-3 py-1.5 font-bold">Cancel</button>
                    <button 
                      onClick={() => {
                        if (newTourneyName.trim() === "") return;
                        setTournaments([...tournaments, { id: newTourneyName.toLowerCase().replace(/\s+/g, '-'), name: newTourneyName, phase: "setup" }]);
                        setIsCreating(false);
                        setNewTourneyName("");
                      }} 
                      className="bg-secondary text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:brightness-110"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsCreating(true)}
                  className="w-full p-4 border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center gap-3 text-background-light hover:bg-primary/5 hover:border-primary/50 transition-all font-bold group"
                >
                  <Plus className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <span>Create New Tournament</span>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-slate-100">
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background-dark/80 backdrop-blur-md px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Trophy className="text-primary w-8 h-8" />
            <h2 className="text-xl font-black tracking-tighter uppercase italic">eFootball Admin</h2>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/draw" className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-sm font-bold hover:bg-secondary/20 transition-all">
              Live Draw
            </Link>
            <button onClick={handleLogout} className="p-2 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] mx-auto w-full p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 space-y-6">
          <div className="glass-panel p-5 rounded-xl">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Global Controls</h3>
            <div className="flex items-center justify-between p-3 bg-background-dark rounded-lg border border-primary/10 mb-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Override Mode</span>
                <span className="text-[10px] text-slate-500 italic">Unlock all fields</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={overrideMode} onChange={() => setOverrideMode(!overrideMode)} />
                <div className="w-11 h-6 bg-primary/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs text-background-light/70">Active Stage</label>
              <select 
                value={settings.activeStage}
                onChange={(e) => updateSettings("activeStage", e.target.value)}
                className="w-full bg-background-dark border border-primary/20 text-sm rounded-lg text-background-light p-2 focus:ring-secondary outline-none"
              >
                <option value="registration">Registration</option>
                <option value="draw">Draw</option>
                <option value="groups">Group Stage</option>
                <option value="knockout">Knockout Stage</option>
              </select>
            </div>

            <div className="space-y-2 mt-4">
              <label className="text-xs text-background-light/70">Entry Fee (₹)</label>
              <input 
                value={settings.entryFee || ""}
                onChange={(e) => updateSettings("entryFee", e.target.value)}
                className="w-full bg-background-dark border border-primary/20 text-sm rounded-lg text-background-light p-2 focus:ring-secondary outline-none"
                placeholder="e.g. 150"
              />
            </div>
            <div className="space-y-2 mt-2">
              <label className="text-xs text-background-light/70">Payment Number (UPI/Phone)</label>
              <input 
                value={settings.paymentNumber || ""}
                onChange={(e) => updateSettings("paymentNumber", e.target.value)}
                className="w-full bg-background-dark border border-primary/20 text-sm rounded-lg text-background-light p-2 focus:ring-secondary outline-none"
                placeholder="e.g. 9876543210"
              />
            </div>
            <div className="space-y-2 mt-2">
              <label className="text-xs text-background-light/70">Payment QR URL</label>
              <input 
                value={settings.paymentQrUrl || ""}
                onChange={(e) => updateSettings("paymentQrUrl", e.target.value)}
                className="w-full bg-background-dark border border-primary/20 text-sm rounded-lg text-background-light p-2 focus:ring-secondary outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Live Rules Editor</h3>
            <textarea 
              value={settings.rules}
              onChange={(e) => setSettings({ ...settings, rules: e.target.value })}
              className="w-full bg-background-dark border border-primary/10 rounded-lg text-xs text-background-light p-3 focus:ring-1 focus:ring-secondary outline-none resize-none h-32 leading-relaxed"
              placeholder="Tournament specific rules..."
            />
            <button 
              onClick={() => updateSettings("rules", settings.rules)}
              className="w-full mt-3 py-2 bg-secondary/20 text-secondary text-xs font-bold rounded hover:bg-secondary/30 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Update Rules
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {/* Payment Approval Queue */}
          <section className="glass-panel rounded-xl overflow-hidden">
            <div className="p-5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="text-primary w-5 h-5" />
                <h3 className="font-bold">Payment Approval Queue</h3>
              </div>
              <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                {pendingPlayers.length} Pending
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-primary/5 text-xs text-background-light/70 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 font-semibold">User Handle</th>
                    <th className="px-6 py-3 font-semibold">eFootball ID</th>
                    <th className="px-6 py-3 font-semibold">Screenshot</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {pendingPlayers.map(player => (
                    <tr key={player.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{player.name}</span>
                          <span className="text-xs text-slate-500">{player.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-primary">{player.efootballId}</td>
                      <td className="px-6 py-4">
                        <a href={player.paymentScreenshotUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View Proof</a>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => updatePlayerStatus(player.id, "approved")} className="px-3 py-1.5 bg-primary/20 text-primary text-xs font-bold rounded hover:bg-primary/30">Approve</button>
                        <button onClick={() => updatePlayerStatus(player.id, "banned")} className="px-3 py-1.5 bg-secondary/20 text-secondary text-xs font-bold rounded hover:bg-secondary/30">Reject</button>
                      </td>
                    </tr>
                  ))}
                  {pendingPlayers.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No pending registrations.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Match Center */}
            <section className="glass-panel rounded-xl overflow-hidden h-full flex flex-col">
              <div className="p-5 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="text-primary w-5 h-5" />
                  <h3 className="font-bold">Manual Score Entry</h3>
                </div>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                {matches.map(match => (
                  <div key={match.id} className="p-3 bg-background-dark border border-primary/10 rounded-lg flex items-center justify-between gap-4">
                    <div className="flex-1 flex flex-col text-right">
                      <span className="text-xs font-bold truncate">{match.homePlayerName}</span>
                      <span className="text-[10px] text-slate-500">Home</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        defaultValue={match.homeScore}
                        onChange={(e) => updateMatchScore(match.id, parseInt(e.target.value) || 0, match.awayScore)}
                        className="w-10 h-10 bg-surface-dark border border-primary/20 rounded text-center text-secondary font-bold focus:ring-1 focus:ring-secondary outline-none" 
                      />
                      <span className="text-background-light/50 font-black">-</span>
                      <input 
                        type="number" 
                        defaultValue={match.awayScore}
                        onChange={(e) => updateMatchScore(match.id, match.homeScore, parseInt(e.target.value) || 0)}
                        className="w-10 h-10 bg-surface-dark border border-primary/20 rounded text-center text-secondary font-bold focus:ring-1 focus:ring-secondary outline-none" 
                      />
                    </div>
                    <div className="flex-1 flex flex-col text-left">
                      <span className="text-xs font-bold truncate">{match.awayPlayerName}</span>
                      <span className="text-[10px] text-slate-500">Away</span>
                    </div>
                  </div>
                ))}
                {matches.length === 0 && (
                  <div className="text-center text-slate-500 py-8">No matches scheduled yet.</div>
                )}
              </div>
            </section>

            {/* Standings Override */}
            <section className="glass-panel rounded-xl overflow-hidden h-full flex flex-col">
              <div className="p-5 border-b border-primary/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="text-primary w-5 h-5" />
                  <h3 className="font-bold">Standings Override</h3>
                </div>
                {overrideMode && <span className="text-[10px] text-white font-bold uppercase animate-pulse">Override Active</span>}
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-primary/5 text-[10px] text-background-light/70 uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3 text-center">Pts</th>
                      <th className="px-4 py-3 text-center">GD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5 text-sm">
                    {approvedPlayers.map(player => (
                      <tr key={player.id} className="hover:bg-primary/5">
                        <td className="px-4 py-3 font-semibold text-xs">{player.name} <span className="text-[10px] text-slate-500">({player.group})</span></td>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="number" 
                            value={player.points || player.points === 0 ? player.points : ""}
                            onChange={(e) => updatePlayerStats(player.id, "points", parseInt(e.target.value) || 0)}
                            disabled={!overrideMode}
                            className={`w-12 h-8 bg-transparent rounded text-center text-slate-100 border-0 ${overrideMode ? 'border border-primary/50 focus:ring-1 focus:ring-primary' : ''}`} 
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="number" 
                            value={player.gd || player.gd === 0 ? player.gd : ""}
                            onChange={(e) => updatePlayerStats(player.id, "gd", parseInt(e.target.value) || 0)}
                            disabled={!overrideMode}
                            className={`w-12 h-8 bg-transparent rounded text-center text-slate-100 border-0 ${overrideMode ? 'border border-primary/50 focus:ring-1 focus:ring-primary' : ''}`} 
                          />
                        </td>
                      </tr>
                    ))}
                    {approvedPlayers.length === 0 && (
                      <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No approved players.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
