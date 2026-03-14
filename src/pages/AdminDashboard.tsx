import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { v4 as uuidv4 } from "uuid";
import { Trophy, Settings, Users, Check, X, LogOut, Edit3, Save, RefreshCw, Plus, Trash2, Eye, EyeOff, ArrowRightLeft } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { id: urlTourneyId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTourneyName, setNewTourneyName] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");

  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [overrideMode, setOverrideMode] = useState(false);

  // Fixture Wizard State
  const [isGeneratingFixtures, setIsGeneratingFixtures] = useState(false);
  const [fixtureWizardStep, setFixtureWizardStep] = useState(1);
  const [selectedFormat, setSelectedFormat] = useState<"knockout" | "round_robin" | "hybrid" | null>(null);
  const [wizardRules, setWizardRules] = useState("");
  const [wizardGroupCount, setWizardGroupCount] = useState(2);
  const [wizardMatches, setWizardMatches] = useState<any[]>([]);
  const [drawnMatchCount, setDrawnMatchCount] = useState(0);
  const [isMatchDrawing, setIsMatchDrawing] = useState(false);
  const [shuffleNames, setShuffleNames] = useState({ home: "SHUFFLING", away: "SHUFFLING" });
  const [groupAssignments, setGroupAssignments] = useState<{ [key: string]: any[] }>({});

  const [showManualPlayerForm, setShowManualPlayerForm] = useState(false);
  const [manualPlayerData, setManualPlayerData] = useState({ name: "", efootballId: "", phone: "" });

  const [showNewMatchForm, setShowNewMatchForm] = useState(false);
  const [newMatchData, setNewMatchData] = useState({ homePlayerId: "", awayPlayerId: "", stage: "Knockout" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user?.email === "admin@efootball.com" || session?.user?.email === "rboopathi1045@gmail.com") {
        setIsAdmin(true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      // For flexibility, any email used to sign up in this dev phase can be considered admin
      // You can restrict this later by specific emails
      if (session?.user) {
        setIsAdmin(true); 
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    
    // Initial fetch of tournaments
    const fetchTournaments = async () => {
      const { data } = await supabase.from('tournaments').select('*').order('"createdAt"', { ascending: false });
      if (data) {
        setTournaments(data);
        if (urlTourneyId) {
          const decodedId = decodeURIComponent(urlTourneyId);
          const matched = data.find(t => t.id === decodedId || t.name === decodedId);
          if (matched) {
            setSelectedTournament(matched);
            setEditTitleValue(matched.name);
          }
        }
      }
    };
    fetchTournaments();

    // Subscribe to tournament changes
    const tourneyChannel = supabase.channel('tournaments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, async () => {
        const { data } = await supabase.from('tournaments').select('*').order('"createdAt"', { ascending: false });
        if (data) setTournaments(data);
      }).subscribe();

    return () => {
      supabase.removeChannel(tourneyChannel);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedTournament) return;

    const fetchScopedData = async () => {
      const { data: pData } = await supabase.from('players').select('*').eq('"tournamentId"', selectedTournament.id);
      if (pData) setPlayers(pData);
      
      const { data: mData } = await supabase.from('matches').select('*').eq('"tournamentId"', selectedTournament.id);
      if (mData) setMatches(mData);
    };
    fetchScopedData();

    // Setup realtime subscription for the active tournament docs
    const dataChannel = supabase.channel('scoped_data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `"tournamentId"=eq.${selectedTournament.id}` }, fetchScopedData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `"tournamentId"=eq.${selectedTournament.id}` }, fetchScopedData)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${selectedTournament.id}` }, (payload) => {
        setSelectedTournament(payload.new as any);
      }).subscribe();

    return () => {
      supabase.removeChannel(dataChannel);
    };
  }, [selectedTournament?.id]);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoginError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message === "Email not confirmed") {
        setLoginError("Login failed: Please confirm your email address in your inbox or disable 'Confirm Email' in Supabase Auth settings.");
      } else {
        setLoginError(error.message || "Invalid email or password.");
      }
    }
  };

  const handleLogout = () => supabase.auth.signOut();

  const updatePlayerStatus = async (id: string, status: string) => {
    // Optimistic update
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, status } : p));

    const { error } = await supabase.from('players').update({ status }).eq('id', id);
    if (error) {
      console.error("Update player status error:", error);
      alert("Failed to update player status: " + error.message);
      // Data will revert on next subscription fetch
    }
  };

  const updateSettings = async (field: string, value: any) => {
    if (!selectedTournament) return;
    
    // Optimistic update for local lists
    setTournaments(prev => prev.map(t => t.id === selectedTournament.id ? { ...t, [field]: value } : t));
    setSelectedTournament(prev => prev ? { ...prev, [field]: value } : null);

    const { error } = await supabase.from('tournaments').update({ [field]: value }).eq('id', selectedTournament.id);
    if (error) {
      console.error("Update settings error:", error);
      alert("Failed to update settings: " + error.message);
    }
  };

  const updateMatchScore = async (id: string, homeScore: number, awayScore: number) => {
    // Optimistic update
    setMatches(prev => prev.map(m => m.id === id ? { ...m, "homeScore": homeScore, "awayScore": awayScore } : m));

    const { error } = await supabase.from('matches').update({ 
      "homeScore": homeScore, 
      "awayScore": awayScore
    }).eq('id', id);
    if (error) {
      console.error("Update match score error:", error);
      alert("Failed to update match score: " + error.message);
    }
  };

  const recalculateStandings = async (tournamentId: string) => {
    // Fetch all players and matches for this tournament
    const { data: allPlayers } = await supabase.from('players').select('*').eq('tournamentId', tournamentId);
    const { data: allMatches } = await supabase.from('matches').select('*').eq('tournamentId', tournamentId).eq('status', 'completed');
    
    if (!allPlayers || !allMatches) return;

    const playerStats = allPlayers.map(player => {
      const pMatches = allMatches.filter(m => m.homePlayerId === player.id || m.awayPlayerId === player.id);
      
      let wins = 0, draws = 0, losses = 0, played = 0, gd = 0, points = 0;

      pMatches.forEach(m => {
        played++;
        const isHome = m.homePlayerId === player.id;
        const hScore = m.homeScore || 0;
        const aScore = m.awayScore || 0;

        if (isHome) {
          gd += (hScore - aScore);
          if (hScore > aScore) wins++;
          else if (hScore < aScore) losses++;
          else draws++;
        } else {
          gd += (aScore - hScore);
          if (aScore > hScore) wins++;
          else if (aScore < hScore) losses++;
          else draws++;
        }
      });

      points = (wins * 3) + draws;

      return {
        id: player.id,
        played, wins, draws, losses, gd, points
      };
    });

    // Batch update players
    for (const stats of playerStats) {
      await supabase.from('players').update({
        played: stats.played,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        gd: stats.gd,
        points: stats.points
      }).eq('id', stats.id);
    }
  };

  const autoAdvanceStage = async (tournamentId: string) => {
    // 1. Fetch current matches
    const { data: allMatches } = await supabase.from('matches').select('*').eq('tournamentId', tournamentId);
    if (!allMatches || allMatches.length === 0) return;

    // 2. Identify the "latest" stage
    const stages = Array.from(new Set(allMatches.map(m => m.round))).filter(Boolean) as string[];
    // Priority order: Group Stage -> Round 1 -> Quarter Final -> Semi Final -> Final
    const stagePriority = (s: string) => {
      if (s.startsWith('Group')) return 1;
      if (s === 'Round 1') return 2;
      if (s === 'Quarter Final') return 3;
      if (s === 'Semi Final') return 4;
      if (s === 'Grand Final') return 5;
      return 0;
    };

    const latestStage = stages.sort((a, b) => stagePriority(b) - stagePriority(a))[0];
    const stageMatches = allMatches.filter(m => m.round === latestStage);
    const allCompleted = stageMatches.every(m => m.status === 'completed');

    if (!allCompleted) return;

    // 3. Determine next stage
    let nextStage = "";
    let qualifiedPlayerIds: string[] = [];

    if (latestStage.startsWith('Group')) {
      // Transition from Groups to Knockout
      // Find all groups
      const groupNames = Array.from(new Set(allMatches.filter(m => m.round?.startsWith('Group')).map(m => m.round!.replace('Group ', ''))));
      
      // Fetch players to get standings
      const { data: players } = await supabase.from('players').select('*').eq('tournamentId', tournamentId);
      if (!players) return;

      const topPlayers: any[] = [];
      groupNames.forEach(gn => {
        const gp = players.filter(p => p.group === gn).sort((a,b) => b.points - a.points || b.gd - a.gd);
        // Take Top 2
        topPlayers.push(...gp.slice(0, 2));
      });

      qualifiedPlayerIds = topPlayers.map(p => p.id);
      
      if (qualifiedPlayerIds.length === 8) nextStage = "Quarter Final";
      else if (qualifiedPlayerIds.length === 4) nextStage = "Semi Final";
      else if (qualifiedPlayerIds.length === 2) nextStage = "Grand Final";
      else return; // Unsupported auto-advance count
    } else if (latestStage === "Quarter Final") {
      qualifiedPlayerIds = stageMatches.map(m => m.homeScore > m.awayScore ? m.homePlayerId : m.awayPlayerId);
      nextStage = "Semi Final";
    } else if (latestStage === "Semi Final") {
      qualifiedPlayerIds = stageMatches.map(m => m.homeScore > m.awayScore ? m.homePlayerId : m.awayPlayerId);
      nextStage = "Grand Final";
    }

    if (!nextStage || qualifiedPlayerIds.length < 2) return;

    // 4. Check if next stage already exists
    const nextStageExists = allMatches.some(m => m.round === nextStage);
    if (nextStageExists) return;

    // 5. Generate and randomize next stage matches
    const { data: playersInfo } = await supabase.from('players').select('id, name').in('id', qualifiedPlayerIds);
    if (!playersInfo) return;

    const randomized = [...playersInfo].sort(() => Math.random() - 0.5);
    const newMatches = [];
    let matchIdx = allMatches.length + 1;

    for (let i = 0; i < randomized.length; i += 2) {
      if (randomized[i+1]) {
        newMatches.push({
          tournamentId,
          homePlayerId: randomized[i].id,
          homePlayerName: randomized[i].name,
          awayPlayerId: randomized[i+1].id,
          awayPlayerName: randomized[i+1].name,
          status: 'pending',
          round: nextStage,
          matchIndex: matchIdx++
        });
      }
    }

    if (newMatches.length > 0) {
      await supabase.from('matches').insert(newMatches);
      alert(`Automated Advance: All ${latestStage} matches completed. ${nextStage} fixtures have been randomized and generated!`);
    }
  };

  const toggleMatchStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));

    const { error } = await supabase.from('matches').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error("Toggle match status error:", error);
      alert("Failed to toggle match status: " + error.message);
    } else if (newStatus === 'completed' && selectedTournament) {
      // Trigger automation
      await recalculateStandings(selectedTournament.id);
      await autoAdvanceStage(selectedTournament.id);
    }
  };

  const updatePlayerStats = async (id: string, field: string, value: any) => {
    // Optimistic update
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

    const { error } = await supabase.from('players').update({ [field]: value }).eq('id', id);
    if (error) {
      console.error("Update player stats error:", error);
      alert("Failed to update player stats: " + error.message);
    }
  };

  const deletePlayer = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this player?")) {
      // Optimistic delete
      setPlayers(prev => prev.filter(p => p.id !== id));

      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) {
        console.error("Delete player error:", error);
        alert("Failed to delete player: " + error.message);
      }
    }
  };

  const deleteMatch = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this match?")) {
      setMatches(prev => prev.filter(m => m.id !== id));
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) {
        console.error("Delete match error:", error);
        alert("Failed to delete match: " + error.message);
      }
    }
  };

  const updateMatchDetails = async (id: string, updates: any) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    const { error } = await supabase.from('matches').update(updates).eq('id', id);
    if (error) {
      console.error("Update match details error:", error);
      alert("Failed to update match details: " + error.message);
    }
  };

  const createCustomMatch = async (e: any) => {
    e.preventDefault();
    if (!selectedTournament) return;
    
    if (newMatchData.homePlayerId === newMatchData.awayPlayerId) {
      alert("A player cannot play against themselves.");
      return;
    }

    const homePlayerName = players.find(p => p.id === newMatchData.homePlayerId)?.name || "TBD";
    const awayPlayerName = players.find(p => p.id === newMatchData.awayPlayerId)?.name || "TBD";

    const matchDoc = {
      tournamentId: selectedTournament.id,
      homePlayerId: newMatchData.homePlayerId,
      homePlayerName: homePlayerName,
      awayPlayerId: newMatchData.awayPlayerId,
      awayPlayerName: awayPlayerName,
      homeScore: 0,
      awayScore: 0,
      status: "pending",
      stage: newMatchData.stage,
      matchIndex: matches.length + 1
    };

    const { error } = await supabase.from('matches').insert([matchDoc]);
    if (error) {
      console.error("Create match error:", error);
      alert("Failed to create match: " + error.message);
    } else {
      setShowNewMatchForm(false);
      setNewMatchData({ homePlayerId: "", awayPlayerId: "", stage: "Knockout" });
    }
  };

  const deleteTournament = async (e: any, id: string) => {
    e.stopPropagation();
    if (window.confirm("WARNING: Are you sure you want to completely delete this tournament? This cannot be undone.")) {
      // Optimistic delete
      setTournaments(prev => prev.filter(t => t.id !== id));
      if (selectedTournament?.id === id) {
        setSelectedTournament(null);
        navigate("/admin");
      }

      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) {
        console.error("Delete tournament error:", error);
        alert("Failed to delete tournament: " + error.message);
      }
    }
  };

  const toggleTournamentVisibility = async (e: any, t: any) => {
    e.stopPropagation();
    const newHidden = !t.isHidden;
    
    // Optimistic update
    setTournaments(prev => prev.map(item => item.id === t.id ? { ...item, isHidden: newHidden } : item));
    if (selectedTournament?.id === t.id) {
      setSelectedTournament(prev => prev ? { ...prev, isHidden: newHidden } : null);
    }

    const { error } = await supabase.from('tournaments').update({ isHidden: newHidden }).eq('id', t.id);
    if (error) {
      console.error("Toggle visibility error:", error);
      alert("Failed to toggle visibility: " + error.message);
    }
  };

  const generateFixtures = async () => {
    setIsGeneratingFixtures(true);
    setFixtureWizardStep(1);
  };

  const finalizeWizardStep1 = (format: "knockout" | "round_robin" | "hybrid") => {
    setSelectedFormat(format);
    setFixtureWizardStep(2);
    
    // Default rules
    if (format === "knockout") setWizardRules("Single Elimination: One loss and you are out.");
    else if (format === "round_robin") setWizardRules("Round Robin: Everyone plays everyone. Winner determined by points.");
    else setWizardRules("Hybrid: Group stages followed by Knockout for the top performers.");
  };

  const finalizeWizardStep2 = () => {
    const verifiedPlayers = players.filter(p => p.status === 'approved');
    
    // Logic for Step 3: Manual Draw Engine Pre-filling
    const groups: { [key: string]: any[] } = {};
    const count = selectedFormat === "hybrid" ? wizardGroupCount : 1;
    
    for (let i = 0; i < count; i++) {
      const key = i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)) : String.fromCharCode(65 + i);
      groups[key] = [];
    }

    // Distribute players
    verifiedPlayers.forEach((p, idx) => {
      const gIndex = idx % count;
      const groupKey = gIndex >= 26 ? String.fromCharCode(65 + Math.floor(gIndex / 26) - 1) + String.fromCharCode(65 + (gIndex % 26)) : String.fromCharCode(65 + gIndex);
      groups[groupKey].push(p);
    });

    setGroupAssignments(groups);
    setFixtureWizardStep(3);
  };

  const handleManualAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTournament) return;
    
    const { data: newPlayer, error } = await supabase.from('players').insert([
      {
        ...manualPlayerData,
        tournamentId: selectedTournament.id,
        status: "approved",
        "group": "None",
        "createdAt": new Date().toISOString()
      }
    ]).select();

    if (error) {
      alert("Failed to add player: " + error.message);
    } else {
      // Optimistic/Immediate update of local state
      if (newPlayer && newPlayer.length > 0) {
        setPlayers(prev => [...prev, newPlayer[0]]);
      }
      setShowManualPlayerForm(false);
      setManualPlayerData({ name: "", efootballId: "", phone: "" });
    }
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
          <div className="w-full max-w-lg glass-panel p-10 rounded-[2.5rem] flex flex-col gap-8 border border-white/5">
            <div className="flex flex-col gap-2 text-center">
              <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">Select Tournament</h3>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Choose a domain to manage</p>
            </div>
            <div className="flex flex-col gap-4">
              {tournaments.length === 0 && !isCreating && (
                <div className="text-center p-4 text-slate-500 text-sm">No tournaments exist yet. Create one!</div>
              )}
              {tournaments.map(t => (
                <div key={t.id} className="group relative glass-panel p-6 rounded-3xl flex flex-col gap-5 border border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(33,197,94,0.1)]">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1.5">
                      <h4 className={`text-2xl font-black italic uppercase tracking-tighter transition-all ${t.isHidden ? 'text-white/20 line-through' : 'text-primary'}`}>{t.name}</h4>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${t.isHidden ? 'bg-white/10' : 'bg-primary animate-pulse shadow-[0_0_8px_rgba(15,164,175,0.5)]'}`}></div>
                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">{t.isHidden ? 'Offline' : 'Live on Site'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => toggleTournamentVisibility(e, t)}
                        className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all duration-300 ${t.isHidden ? 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-800' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:scale-105'}`}
                        title={t.isHidden ? "Show Publicly" : "Hide from Public"}
                      >
                        {t.isHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={(e) => deleteTournament(e, t.id)}
                        className="w-12 h-12 flex items-center justify-center bg-secondary/10 border border-secondary/20 text-secondary rounded-2xl hover:bg-secondary/20 transition-all duration-300 hover:scale-105"
                        title="Delete Tournament"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Current Phase</label>
                      <div className="relative">
                        <select 
                          value={t.activeStage || "registration"}
                          onChange={async (e) => {
                            const newStage = e.target.value;
                            // Optimistic update
                            setTournaments(prev => prev.map(item => item.id === t.id ? { ...item, activeStage: newStage } : item));
                            const { error } = await supabase.from('tournaments').update({ activeStage: newStage }).eq('id', t.id);
                            if (error) alert("Failed to change stage: " + error.message);
                          }}
                          className="w-full bg-background-dark/80 backdrop-blur-md border border-white/5 rounded-2xl px-5 py-3.5 text-xs font-black uppercase tracking-widest text-white outline-none focus:border-primary/40 appearance-none cursor-pointer hover:bg-background-dark transition-colors"
                        >
                          <option value="registration">Registration</option>
                          <option value="draw">Draw</option>
                          <option value="groups">Group Stage</option>
                          <option value="knockout">Knockout Stage</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-background-light/30">
                          <Settings className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedTournament(t);
                        setEditTitleValue(t.name);
                        navigate(`/admin/${encodeURIComponent(t.name)}`);
                      }}
                      className="h-[52px] self-end bg-primary text-background-dark font-black uppercase text-[10px] tracking-[0.2em] px-8 rounded-2xl hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_10px_25px_rgba(15,164,175,0.2)] active:scale-95"
                    >
                      Enter Dashboard <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

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
                          onClick={async () => {
                            if (newTourneyName.trim() === "") return;
                            const newId = newTourneyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            
                            const newTourneyObj = {
                              id: newId,
                              name: newTourneyName,
                              "activeStage": "registration",
                              "entryFee": "100",
                              "paymentNumber": "",
                              "paymentQrUrl": "",
                              rules: "Default rules apply.",
                              "isHidden": false,
                              "createdAt": new Date().toISOString()
                            };

                            // Optimistic add
                            setTournaments(prev => [newTourneyObj, ...prev]);
                            setIsCreating(false);
                            setNewTourneyName("");

                            const { error } = await supabase.from('tournaments').insert([newTourneyObj]);
                            
                            if (error) {
                              console.error("Create tournament error:", error);
                              alert("Failed to create tournament: " + error.message);
                              // Revert
                              setTournaments(prev => prev.filter(t => t.id !== newId));
                            }
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
                  className="w-full h-[72px] border border-dashed border-white/5 rounded-[1.5rem] flex items-center justify-center gap-3 text-white/20 hover:bg-white/5 hover:border-primary/30 transition-all text-[11px] font-extrabold uppercase tracking-wider px-5 py-2.5"
                >
                  <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span>Start New Tournament</span>
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
            <button 
              onClick={() => {
                setSelectedTournament(null);
                navigate("/admin");
              }}
              className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors"
            >
              <Trophy className="w-8 h-8" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 group">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input 
                      autoFocus
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onBlur={() => {
                        if (editTitleValue !== selectedTournament.name) {
                          updateSettings("name", editTitleValue);
                        }
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editTitleValue !== selectedTournament.name) {
                            updateSettings("name", editTitleValue);
                          }
                          setIsEditingTitle(false);
                        }
                      }}
                      className="bg-white/5 border border-primary/30 rounded-lg px-2 py-1 text-xl font-black text-white italic outline-none uppercase tracking-tighter"
                    />
                  </div>
                ) : (
                  <h2 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                    {selectedTournament?.name}
                    <Edit3 className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors" />
                  </h2>
                )}
              </div>
              <span className="text-[11px] text-white/30 font-extrabold uppercase tracking-wider -mt-1">eFootball Admin Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to={`/draw/${encodeURIComponent(selectedTournament.name)}`} className="px-4 py-2 bg-secondary/10 text-secondary border border-secondary/20 rounded-lg text-sm font-bold hover:bg-secondary/20 transition-all">
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
        <aside className="w-full lg:w-80 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-[11px] font-extrabold text-white/40 uppercase tracking-wider">Tournament Settings</h3>
            </div>

            <div className="p-4 bg-background-dark/50 rounded-2xl border border-white/5 mb-6 flex items-center justify-between group">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white uppercase tracking-tight italic">Override Mode</span>
                 <span className="text-[11px] text-white/30 font-extrabold uppercase tracking-tight">Edit Stats directly</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={overrideMode} onChange={() => setOverrideMode(!overrideMode)} />
                <div className="w-12 h-6.5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/20 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary after:peer-checked:bg-white shadow-inner"></div>
              </label>
            </div>
            
            <div className="space-y-5">
              <div className="space-y-2">
                 <label className="text-[11px] font-extrabold text-white/40 uppercase tracking-wider ml-1">Current Live Phase</label>
                <div className="relative">
                  <select 
                    value={selectedTournament?.activeStage || "registration"}
                    onChange={(e) => updateSettings("activeStage", e.target.value)}
                    className="w-full bg-background-dark/50 border border-white/5 text-sm font-bold rounded-2xl text-white p-4 focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer hover:bg-background-dark transition-colors"
                  >
                    <option value="registration">Registration</option>
                    <option value="draw">Draw</option>
                    <option value="groups">Group Stage</option>
                    <option value="knockout">Knockout Stage</option>
                  </select>
                  <ArrowRightLeft className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 rotate-90" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Registration Fee (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                  <input 
                    value={selectedTournament?.entryFee || ""}
                    onChange={(e) => updateSettings("entryFee", e.target.value)}
                    className="w-full bg-background-dark/50 border border-white/5 text-sm font-black rounded-2xl text-white py-4 pl-8 pr-4 focus:ring-1 focus:ring-primary outline-none"
                    placeholder="0 for Free"
                  />
                </div>
              </div>

              <div className="space-y-2 text-white/30">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1">Payment UPI ID / No.</label>
                <input 
                  value={selectedTournament?.paymentNumber || ""}
                  onChange={(e) => updateSettings("paymentNumber", e.target.value)}
                  className="w-full bg-background-dark/50 border border-white/5 text-sm font-bold rounded-2xl text-white p-4 focus:ring-1 focus:ring-primary outline-none"
                  placeholder="e.g. 9876543210@upi"
                />
              </div>

            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-secondary" />
              </div>
              <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Live Rules</h3>
            </div>
            <textarea 
              value={selectedTournament?.rules || ""}
              onChange={(e) => setSelectedTournament({ ...selectedTournament, rules: e.target.value })}
              className="w-full bg-background-dark/50 border border-white/5 rounded-2xl text-[13px] text-white/80 p-5 focus:ring-1 focus:ring-secondary outline-none resize-none h-48 leading-relaxed mb-4 scrollbar-hide"
              placeholder="Define tournament rules..."
            />
            <button 
              onClick={() => updateSettings("rules", selectedTournament.rules)}
              className="w-full py-4 bg-secondary text-white text-[11px] font-extrabold uppercase tracking-wider px-5 py-2.5xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
            >
              <Save className="w-4 h-4" /> Save Rules Update
            </button>
          </div>
        </aside>
      {isGeneratingFixtures && (
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
              <button onClick={() => setIsGeneratingFixtures(false)} className="p-2 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Wizard Content */}
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
                        onClick={() => finalizeWizardStep1(format.id as any)}
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
                          <button 
                            onClick={() => {
                              const newCount = Math.max(1, wizardGroupCount - 1);
                              setWizardGroupCount(newCount);
                              updateSettings("groupCount", newCount.toString());
                            }}
                            className="absolute left-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors z-10"
                          >-</button>
                          <input
                            type="number"
                            min="1"
                            max="32"
                            value={wizardGroupCount}
                            onChange={(e) => {
                              const newCount = parseInt(e.target.value) || 1;
                              setWizardGroupCount(newCount);
                              updateSettings("groupCount", newCount.toString());
                            }}
                            className="w-full bg-background-dark/50 border border-primary/30 rounded-full px-12 py-4 text-center text-4xl font-black italic text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                          />
                          <button 
                            onClick={() => {
                              const newCount = wizardGroupCount + 1;
                              setWizardGroupCount(newCount);
                              updateSettings("groupCount", newCount.toString());
                            }}
                            className="absolute right-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors z-10"
                          >+</button>
                        </div>
                      </div>
                    )}

                    {selectedFormat === 'knockout' && (
                      <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/20 space-y-3">
                        <div className="flex items-center gap-3 text-orange-500">
                          <Settings className="w-5 h-5 animate-spin-slow" />
                          <h6 className="font-bold uppercase text-xs tracking-wider">Bye Logic Warning</h6>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">
                          Your player count is <span className="text-white font-bold">{players.filter(p => p.status === 'approved').length}</span>. 
                          {Math.log2(players.filter(p => p.status === 'approved').length) % 1 !== 0 
                            ? ` Note: ${Math.pow(2, Math.ceil(Math.log2(players.filter(p => p.status === 'approved').length))) - players.filter(p => p.status === 'approved').length} Byes will be automatically added. You can manually assign these in the next step.`
                            : " Perfect! Your player count is a power of 2."}
                        </p>
                      </div>
                    )}

                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                      <div className="flex items-center gap-3 text-primary">
                        <Users className="w-5 h-5" />
                        <h6 className="font-bold uppercase text-xs tracking-wider">Participation Summary</h6>
                      </div>
                      <p className="text-sm text-white/60">
                        Total Verified Players: <span className="text-white font-bold">{players.filter(p => p.status === 'approved').length}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setFixtureWizardStep(1)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                      Back
                    </button>
                    <button onClick={finalizeWizardStep2} className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]">
                      Continue to Draw Engine
                    </button>
                  </div>
                </div>
              )}

              {fixtureWizardStep === 3 && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center space-y-2">
                    <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white">Manual Draw Engine</h4>
                    <p className="text-white/40 text-sm">Review players and assign them to groups or adjust seeds.</p>
                  </div>

                  <div 
                    className="grid gap-6" 
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
                  >
                    {Object.entries(groupAssignments).map(([groupKey, players]) => (
                      <div key={groupKey} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h5 className="text-sm font-black text-primary uppercase tracking-widest italic">Group {groupKey}</h5>
                          <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md font-bold">{(players as any[]).length} Players</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 min-h-[300px] space-y-3">
                          {(players as any[]).map((player) => (
                            <div key={player.id} className="p-4 bg-background-dark/50 border border-white/5 rounded-xl group relative hover:border-primary/30 transition-all">
                              <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-white italic truncate uppercase">{player.name}</span>
                                  <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">SEED {player.seed || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select 
                                    className="bg-transparent text-[10px] text-primary font-black uppercase outline-none focus:ring-0 cursor-pointer"
                                    value={groupKey}
                                    onChange={(e) => {
                                      const targetGroup = e.target.value;
                                      const newAssignments = { ...groupAssignments };
                                      newAssignments[groupKey] = (newAssignments[groupKey] as any[]).filter(p => p.id !== player.id);
                                      if (!newAssignments[targetGroup]) newAssignments[targetGroup] = [];
                                      (newAssignments[targetGroup] as any[]).push(player);
                                      setGroupAssignments(newAssignments);
                                    }}
                                  >
                                    {Object.keys(groupAssignments).map(key => <option key={key} value={key} className="bg-background-dark">Move to {key}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                          {(players as any[]).length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/10 py-12">
                              <Users className="w-8 h-8 mb-2 opacity-20" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Empty Group</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setFixtureWizardStep(2)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                      Back
                    </button>
                    <button 
                      onClick={() => {
                        const generated: any[] = [];
                        let matchIdx = 1;

                        if (selectedFormat === 'round_robin' || selectedFormat === 'hybrid') {
                          Object.entries(groupAssignments).forEach(([groupKey, groupPlayers]) => {
                            const pList = [...(groupPlayers as any[])].sort(() => Math.random() - 0.5);
                            let groupMatches: any[] = [];
                            for (let i = 0; i < pList.length; i++) {
                              for (let j = i + 1; j < pList.length; j++) {
                                groupMatches.push({
                                  "tournamentId": selectedTournament.id,
                                  "homePlayerId": pList[i].id,
                                  "homePlayerName": pList[i].name,
                                  "awayPlayerId": pList[j].id,
                                  "awayPlayerName": pList[j].name,
                                  status: "pending",
                                  round: selectedFormat === 'hybrid' ? `Group ${groupKey}` : 'Round Robin',
                                });
                              }
                            }
                            // Shuffle matches within the group for unpredictable schedule
                            groupMatches = groupMatches.sort(() => Math.random() - 0.5);
                            generated.push(...groupMatches);
                          });
                          generated.forEach(m => m.matchIndex = matchIdx++);
                        } else if (selectedFormat === 'knockout') {
                          const pList = [...(groupAssignments['A'] as any[])].sort(() => Math.random() - 0.5);
                          for (let i = 0; i < pList.length; i += 2) {
                            if (pList[i + 1]) {
                              generated.push({
                                "tournamentId": selectedTournament.id,
                                "homePlayerId": pList[i].id,
                                "homePlayerName": pList[i].name,
                                "awayPlayerId": pList[i+1].id,
                                "awayPlayerName": pList[i+1].name,
                                status: "pending",
                                round: "Round 1",
                                "matchIndex": matchIdx++
                              });
                            } else {
                              generated.push({
                                "tournamentId": selectedTournament.id,
                                "homePlayerId": pList[i].id,
                                "homePlayerName": pList[i].name,
                                "awayPlayerId": "bye",
                                "awayPlayerName": "BYE",
                                status: "completed",
                                "homeScore": 3,
                                "awayScore": 0,
                                round: "Round 1",
                                "matchIndex": matchIdx++
                              });
                            }
                          }
                        }

                        setWizardMatches(generated);
                        setDrawnMatchCount(0);
                        setFixtureWizardStep(4);
                      }} 
                      className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]"
                    >
                      Preview Fixture Matrix
                    </button>
                  </div>
                </div>
              )}

              {fixtureWizardStep === 4 && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center space-y-2">
                    <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white">Fixture Matrix</h4>
                    <p className="text-white/40 text-sm">Review pairings. Use the dropdowns for manual interception.</p>
                    <div className="pt-4">
                      <a 
                        href={`/draw/${encodeURIComponent(selectedTournament.name)}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2 bg-secondary/20 text-secondary border border-secondary/30 rounded-full text-[11px] font-extrabold uppercase tracking-wider hover:bg-secondary/30 transition-all"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Open Live Draw Dashboard
                      </a>
                    </div>
                  </div>

                  {drawnMatchCount < wizardMatches.length && (
                    <div className="flex flex-col items-center justify-center p-8 glass-panel rounded-3xl border border-primary/20 relative overflow-hidden">
                      <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full"></div>
                      <h4 className="text-lg font-black italic uppercase tracking-widest text-primary z-10 mb-6">Drawing Match {drawnMatchCount + 1} of {wizardMatches.length}</h4>
                      
                      {isMatchDrawing || shuffleNames.home !== "SHUFFLING" ? (
                         <div className="flex flex-col items-center justify-center gap-6 z-10 mb-2">
                           <div className="flex items-center justify-center gap-6">
                             <div className={`w-48 h-20 bg-background-dark border ${isMatchDrawing ? 'border-primary/50 text-white/50' : 'border-emerald-500/50 text-white bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]'} rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all`}>
                               <span className="font-black italic text-xl uppercase tracking-wider truncate px-4">{shuffleNames.home}</span>
                             </div>
                             <div className="text-primary font-black text-2xl tracking-[0.2em] italic">VS</div>
                             <div className={`w-48 h-20 bg-background-dark border ${isMatchDrawing ? 'border-primary/50 text-white/50' : 'border-emerald-500/50 text-white bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.3)]'} rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all`}>
                               <span className="font-black italic text-xl uppercase tracking-wider truncate px-4">{shuffleNames.away}</span>
                             </div>
                           </div>
                         </div>
                      ) : (
                        <div className="flex gap-4 z-10">
                          <button 
                            onClick={() => {
                              const nextMatch = wizardMatches[drawnMatchCount];
                              setIsMatchDrawing(true);
                              // 1.5s shuffle phase
                              setTimeout(() => {
                                setIsMatchDrawing(false);
                                // Show actual result in the box for 1.5s
                                setShuffleNames({
                                  home: nextMatch.homePlayerName,
                                  away: nextMatch.awayPlayerName
                                });
                                
                                // Then clear and move to next
                                setTimeout(() => {
                                  setDrawnMatchCount(prev => prev + 1);
                                  setShuffleNames({ home: "SHUFFLING", away: "SHUFFLING" });
                                }, 1500);

                              }, 1500); 
                            }}
                            className="px-8 py-3 bg-secondary text-white font-black uppercase text-sm tracking-widest rounded-xl hover:brightness-110 transition-all shadow-[0_0_15px_rgba(150,71,52,0.4)]"
                          >
                            Draw Next Match
                          </button>
                          <button 
                            onClick={() => setDrawnMatchCount(wizardMatches.length)}
                            className="px-6 py-3 bg-white/5 text-white/50 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all border border-white/10"
                          >
                            Skip Animation
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {drawnMatchCount > 0 && (
                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-4 fade-in duration-500">
                      <table className="w-full text-left">
                        <thead className="bg-white/[0.02] text-[10px] text-white/30 uppercase tracking-[0.2em]">
                          <tr>
                            <th className="px-8 py-4 font-black">#</th>
                            <th className="px-8 py-4 font-black">Round</th>
                            <th className="px-8 py-4 font-black text-right">Home Player</th>
                            <th className="px-8 py-4 font-black text-center">Outcome</th>
                            <th className="px-8 py-4 font-black">Away Player</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {wizardMatches.slice(0, drawnMatchCount).map((match, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group animate-in slide-in-from-left-4 fade-in duration-300">
                              <td className="px-8 py-4 text-xs font-bold text-white/20">{match.matchIndex}</td>
                              <td className="px-8 py-4 text-[10px] font-black uppercase text-primary tracking-wider">{match.round}</td>
                              <td className="px-8 py-4 text-right">
                                <select 
                                  className="bg-transparent text-sm font-bold text-white/70 italic text-right outline-none cursor-pointer hover:text-white"
                                  value={match.homePlayerId}
                                  onChange={(e) => {
                                    const targetId = e.target.value;
                                    const targetName = players.find(p => p.id === targetId)?.name || "BYE";
                                    const newMatches = [...wizardMatches];
                                    newMatches[idx] = { ...match, homePlayerId: targetId, homePlayerName: targetName };
                                    setWizardMatches(newMatches);
                                  }}
                                >
                                  {players.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id} className="bg-background-dark">{p.name}</option>)}
                                  <option value="bye" className="bg-background-dark">BYE</option>
                                </select>
                              </td>
                              <td className="px-8 py-4 text-center text-[10px] font-black text-white/10 uppercase tracking-[0.2em]">VS</td>
                              <td className="px-8 py-4">
                                <select 
                                  className="bg-transparent text-sm font-bold text-white/70 italic outline-none cursor-pointer hover:text-white"
                                  value={match.awayPlayerId}
                                  onChange={(e) => {
                                    const targetId = e.target.value;
                                    const targetName = players.find(p => p.id === targetId)?.name || "BYE";
                                    const newMatches = [...wizardMatches];
                                    newMatches[idx] = { ...match, awayPlayerId: targetId, awayPlayerName: targetName };
                                    setWizardMatches(newMatches);
                                  }}
                                >
                                  {players.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id} className="bg-background-dark">{p.name}</option>)}
                                  <option value="bye" className="bg-background-dark">BYE</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {drawnMatchCount === wizardMatches.length && (
                    <div className="flex gap-4 animate-in zoom-in fade-in duration-500">
                      <button onClick={() => setFixtureWizardStep(3)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                        Back
                      </button>
                      <button onClick={() => setFixtureWizardStep(5)} className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]">
                        Continue to Launch
                      </button>
                    </div>
                  )}
                </div>
              )}

              {fixtureWizardStep === 5 && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
                  <div className="text-center space-y-2">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <Trophy className="w-10 h-10" />
                    </div>
                    <h4 className="text-3xl font-black italic uppercase tracking-tighter text-white">Finalize & Launch</h4>
                    <p className="text-white/40 text-sm">Review your custom rules before starting the tournament.</p>
                  </div>

                  <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Launch Instructions & Rules</label>
                      <textarea 
                        value={wizardRules}
                        onChange={(e) => setWizardRules(e.target.value)}
                        className="w-full h-40 bg-background-dark/50 border border-white/5 rounded-2xl p-5 text-sm text-white/80 leading-relaxed outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Matches ready</span>
                        <span className="text-xl font-black text-primary italic">{wizardMatches.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setFixtureWizardStep(4)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                      Back
                    </button>
                    <button 
                      onClick={async () => {
                        const { error: matchError } = await supabase.from('matches').insert(wizardMatches);
                        if (matchError) {
                          alert("Failed to insert matches: " + matchError.message);
                          return;
                        }

                        // Update tournament status and rules
                        await updateSettings("activeStage", selectedFormat === 'knockout' ? 'knockout' : 'groups');
                        await updateSettings("rules", wizardRules);
                        await updateSettings("groupCount", wizardGroupCount);

                        setIsGeneratingFixtures(false);
                        alert("Tournament Launched Successfully!");
                      }} 
                      className="flex-[2] px-8 py-4 bg-secondary text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(239,68,68,0.2)]"
                    >
                      🚀 Launch Tournament
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {/* Player Management */}
          <section className="glass-panel rounded-[2rem] overflow-hidden border border-white/5 bg-white/[0.01] backdrop-blur-xl">
            <div className="p-7 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Users className="text-primary w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Player Management</h3>
                  <p className="text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{pendingPlayers.length} Pending Approval</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                  <button onClick={() => setShowManualPlayerForm(true)} className="bg-white/5 text-white font-extrabold uppercase text-[11px] tracking-wider px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> Manual Entry
                  </button>
                </div>
            </div>

            {showManualPlayerForm && (
              <form onSubmit={handleManualAddPlayer} className="p-7 bg-primary/[0.03] border-b border-white/5 grid grid-cols-1 md:grid-cols-4 gap-6 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Full Name</label>
                  <input required value={manualPlayerData.name} onChange={e => setManualPlayerData({...manualPlayerData, name: e.target.value})} className="bg-background-dark/80 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="e.g. Cristiano" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">eFootball User ID (Optional)</label>
                  <input value={manualPlayerData.efootballId} onChange={e => setManualPlayerData({...manualPlayerData, efootballId: e.target.value})} className="bg-background-dark/80 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="000-000-000" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">WhatsApp No. (Optional)</label>
                  <input value={manualPlayerData.phone} onChange={e => setManualPlayerData({...manualPlayerData, phone: e.target.value})} className="bg-background-dark/80 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="+91 ..." />
                </div>
                <button type="submit" className="h-[52px] bg-primary text-background-dark font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10">Add Player to Roster</button>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/[0.02] text-[11px] text-white/40 uppercase tracking-wider">
                  <tr>
                    <th className="px-8 py-5 font-black">Registrant</th>
                    <th className="px-8 py-5 font-black text-center">In-Game ID</th>
                    <th className="px-8 py-5 font-black text-center">Payment Proof</th>
                    <th className="px-8 py-5 font-black text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pendingPlayers.map(player => (
                    <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{player.name}</span>
                          <span className="text-[11px] text-white/30 font-medium">{player.phone}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-3 py-1.5 bg-background-dark/50 border border-white/5 rounded-lg font-mono text-xs text-primary/80">{player.efootballId}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <a href={player.paymentScreenshotUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-white/40 hover:text-primary transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <Eye className="w-3.5 h-3.5" /> View Slip
                        </a>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                        <button onClick={() => updatePlayerStatus(player.id, "approved")} className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/20 border border-primary/20 transition-all">Approve</button>
                        <button onClick={() => updatePlayerStatus(player.id, "banned")} className="px-4 py-2 bg-secondary/10 text-secondary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-secondary/20 border border-secondary/20 transition-all">Reject</button>
                      </td>
                    </tr>
                  ))}
                  {pendingPlayers.length === 0 && (
                    <tr><td colSpan={4} className="px-8 py-12 text-center text-white/20 italic text-sm">No registrations awaiting review.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Match Center */}
            <section className="glass-panel rounded-[2rem] overflow-hidden flex flex-col border border-white/5 bg-white/[0.01] backdrop-blur-xl">
              <div className="p-7 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Trophy className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Match Center</h3>
                    <p className="text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{matches.length} matches total</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {matches.length === 0 && approvedPlayers.length > 0 && (
                    <button 
                      onClick={generateFixtures}
                      className="px-5 py-2.5 bg-secondary text-white text-[11px] font-extrabold rounded-xl uppercase tracking-wider hover:brightness-110 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-secondary/10"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Generate Fixtures
                    </button>
                  )}
                  {overrideMode && (
                    <button 
                      onClick={() => setShowNewMatchForm(!showNewMatchForm)}
                      className="px-5 py-2.5 bg-primary/20 text-primary border border-primary/20 text-[11px] font-extrabold rounded-xl uppercase tracking-wider hover:bg-primary/30 flex items-center gap-2 transition-all active:scale-95"
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
                    <input required value={newMatchData.stage} onChange={e => setNewMatchData({...newMatchData, stage: e.target.value})} className="bg-background-dark/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="e.g. Quarter Final" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Home Player</label>
                    <select required value={newMatchData.homePlayerId} onChange={e => setNewMatchData({...newMatchData, homePlayerId: e.target.value})} className="bg-background-dark/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:border-primary/50 outline-none">
                      <option value="" disabled>Select Home</option>
                      {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name} {p.group ? `(${p.group})` : ''}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Away Player</label>
                    <select required value={newMatchData.awayPlayerId} onChange={e => setNewMatchData({...newMatchData, awayPlayerId: e.target.value})} className="bg-background-dark/80 border border-white/5 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:border-primary/50 outline-none">
                      <option value="" disabled>Select Away</option>
                      {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name} {p.group ? `(${p.group})` : ''}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="h-[46px] bg-primary text-background-dark font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10">Add Match</button>
                </form>
              )}
              <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-[300px] scrollbar-hide">
                {matches.sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map(match => (
                  <div key={match.id} className="p-5 flex flex-col gap-3 bg-background-dark/50 border border-white/5 rounded-3xl hover:border-primary/20 transition-all group relative">
                    {overrideMode && (
                      <button 
                        onClick={() => deleteMatch(match.id)}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-secondary border-2 border-background-dark text-white rounded-full flex items-center justify-center hover:scale-110 shadow-lg transition-transform z-10"
                        title="Delete Match"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {overrideMode && (
                       <div className="flex justify-between items-center px-4">
                         <input 
                           value={match.stage || ''} 
                           onChange={e => updateMatchDetails(match.id, { stage: e.target.value })} 
                           className="bg-transparent text-[10px] font-black uppercase text-primary tracking-widest outline-none border-b border-white/10 focus:border-primary pb-1"
                           placeholder="STAGE"
                         />
                         <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">#{match.matchIndex}</span>
                       </div>
                    )}
                    <button 
                      onClick={() => toggleMatchStatus(match.id, match.status)}
                      className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase shadow-lg transition-all hover:scale-110 active:scale-95 border-2 border-background-dark ${
                        match.status === 'completed' 
                          ? 'bg-secondary text-white' 
                          : 'bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/30'
                      }`}
                    >
                      {match.status === 'completed' ? 'FT' : 'TBD'}
                    </button>
                    <div className="flex items-center justify-between gap-6 pl-4">
                      <div className="flex-1 flex flex-col text-right">
                        {overrideMode ? (
                          <select 
                            value={match.homePlayerId || ''} 
                            onChange={(e) => {
                              const targetId = e.target.value;
                              const targetName = players.find(p => p.id === targetId)?.name || "TBD";
                              updateMatchDetails(match.id, { homePlayerId: targetId, homePlayerName: targetName });
                            }}
                            className="bg-background-dark border border-white/5 rounded-xl px-2 py-1.5 text-xs text-white font-bold outline-none text-right"
                          >
                            <option value="">Select Home</option>
                            {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{match.homePlayerName}</span>
                        )}
                        {!overrideMode && <span className="text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{match.stage || "Home"}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" 
                          defaultValue={match.homeScore}
                          onBlur={(e) => updateMatchScore(match.id, parseInt(e.target.value) || 0, match.awayScore)}
                          className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl text-center text-primary font-black text-lg focus:border-primary/50 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        />
                        <span className="text-white/20 font-black text-xl italic">:</span>
                        <input 
                          type="number" 
                          defaultValue={match.awayScore}
                          onBlur={(e) => updateMatchScore(match.id, match.homeScore, parseInt(e.target.value) || 0)}
                          className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl text-center text-primary font-black text-lg focus:border-primary/50 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        />
                      </div>
                      <div className="flex-1 flex flex-col text-left">
                        {overrideMode ? (
                          <select 
                            value={match.awayPlayerId || ''} 
                            onChange={(e) => {
                              const targetId = e.target.value;
                              const targetName = players.find(p => p.id === targetId)?.name || "TBD";
                              updateMatchDetails(match.id, { awayPlayerId: targetId, awayPlayerName: targetName });
                            }}
                            className="bg-background-dark border border-white/5 rounded-xl px-2 py-1.5 text-xs text-white font-bold outline-none"
                          >
                            <option value="">Select Away</option>
                            {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{match.awayPlayerName}</span>
                        )}
                        {!overrideMode && <span className="text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{match.group ? `Grp ${match.group}` : 'Away'}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {matches.length === 0 && (
                  <div className="text-center py-16 flex flex-col items-center gap-4 text-white/20">
                    <div className="w-16 h-16 rounded-3xl bg-white/[0.02] flex items-center justify-center">
                      <Settings className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium italic">No active matches to display.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Standings Override */}
            <section className="glass-panel rounded-[2rem] overflow-hidden flex flex-col border border-white/5 bg-white/[0.01] backdrop-blur-xl">
              <div className="p-7 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <Edit3 className="text-secondary w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Board Override</h3>
                    <p className="text-[11px] text-white/30 font-extrabold uppercase tracking-wider">Approved Roster Only</p>
                  </div>
                </div>
                <button 
                  onClick={() => setOverrideMode(!overrideMode)}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-all border ${
                    overrideMode 
                      ? 'bg-primary/20 text-primary border-primary/20 animate-pulse'
                      : 'bg-white/5 text-white/40 border-white/5 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {overrideMode ? 'Live Editing Mode' : 'Viewing Mode'}
                </button>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] text-[11px] text-white/40 uppercase tracking-wider">
                    <tr>
                      <th className="px-8 py-5 font-black">Player Name</th>
                      <th className="px-8 py-5 font-black text-center">Group</th>
                      <th className="px-8 py-5 font-black text-center">Points</th>
                      <th className="px-8 py-5 font-black text-center">GD</th>
                      <th className="px-8 py-5 font-black text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {approvedPlayers.map(player => (
                      <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          {overrideMode ? (
                            <input 
                              type="text"
                              defaultValue={player.name}
                              onBlur={(e) => updatePlayerStats(player.id, "name", e.target.value)}
                              className="w-full bg-background-dark/50 border border-white/10 focus:border-primary/50 rounded-xl px-4 py-2 text-sm text-white font-bold outline-none"
                            />
                          ) : (
                            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{player.name}</span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-extrabold text-white/40 group-hover:text-primary group-hover:bg-primary/10 transition-all uppercase tracking-wider">{player.group || "N/A"}</span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <input 
                            type="number" 
                            defaultValue={player.points}
                            onBlur={(e) => updatePlayerStats(player.id, "points", parseInt(e.target.value) || 0)}
                            disabled={!overrideMode}
                            className={`w-14 h-10 bg-transparent rounded-xl text-center text-sm font-black text-white transition-all ${overrideMode ? 'bg-white/5 border border-white/20 focus:border-primary cursor-text text-secondary' : 'border-0 cursor-default opacity-50'}`} 
                          />
                        </td>
                        <td className="px-8 py-6 text-center">
                          <input 
                            type="number" 
                            defaultValue={player.gd}
                            onBlur={(e) => updatePlayerStats(player.id, "gd", parseInt(e.target.value) || 0)}
                            disabled={!overrideMode}
                            className={`w-14 h-10 bg-transparent rounded-xl text-center text-sm font-black text-white transition-all ${overrideMode ? 'bg-white/5 border border-white/20 focus:border-primary cursor-text text-secondary' : 'border-0 cursor-default opacity-50'}`} 
                          />
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => deletePlayer(player.id)}
                            className="w-10 h-10 flex items-center justify-center text-secondary hover:bg-secondary/10 rounded-2xl transition-all active:scale-95 group/btn"
                            title="Remove Player Permanently"
                          >
                            <Trash2 className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {approvedPlayers.length === 0 && (
                      <tr><td colSpan={5} className="px-8 py-16 text-center text-white/20 italic text-sm">Roster is empty.</td></tr>
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
