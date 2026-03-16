import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { v4 as uuidv4 } from "uuid";
import { Trophy, Settings, Users, Check, X, LogOut, Edit3, Save, RefreshCw, Plus, Trash2, Eye, EyeOff, ArrowRightLeft, Dices, CheckCircle2, PlusCircle } from "lucide-react";
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
  const [targetQualifiers, setTargetQualifiers] = useState<number>(4);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState<number>(2);
  const [roundRobinType, setRoundRobinType] = useState<"single" | "double">("single");
  const [unassignedPlayers, setUnassignedPlayers] = useState<any[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const [showManualPlayerForm, setShowManualPlayerForm] = useState(false);
  const [manualPlayerData, setManualPlayerData] = useState({ name: "", efootballId: "", phone: "" });
  const [isLaunching, setIsLaunching] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    const fetchTournaments = async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('id, name, isHidden, activeStage, entryFee, isPaid, paymentNumber, rules, target_qualifiers, format, qualifiers_per_group, groupCount')
        .order('"createdAt"', { ascending: false });
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

    const tourneyChannel = supabase.channel('tournaments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, async () => {
        const { data } = await supabase
          .from('tournaments')
          .select('id, name, isHidden, activeStage, entryFee, isPaid, paymentNumber, rules, target_qualifiers, format, qualifiers_per_group, groupCount')
          .order('"createdAt"', { ascending: false });
        if (data) setTournaments(data);
      }).subscribe();

    return () => {
      supabase.removeChannel(tourneyChannel);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedTournament) return;

    const fetchScopedData = async () => {
      const { data: pData } = await supabase
        .from('players')
        .select('id, name, efootballId, phone, status, group, points, gd, played, wins, draws, losses, seed, tournamentId')
        .eq('"tournamentId"', selectedTournament.id);
      if (pData) setPlayers(pData);

      const { data: mData } = await supabase
        .from('matches')
        .select('id, homePlayerId, awayPlayerId, homePlayerName, awayPlayerName, homeScore, awayScore, status, round, stage, matchIndex, tournamentId')
        .eq('"tournamentId"', selectedTournament.id);
      if (mData) setMatches(mData);
    };
    fetchScopedData();

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
    } else {
      // If match is already completed, recalculate standings
      const match = matches.find(m => m.id === id);
      if (match?.status === 'completed' && selectedTournament) {
        await recalculateStandings(selectedTournament.id);
        await autoAdvanceStage(selectedTournament.id);
      }
    }
  };

  const recalculateStandings = async (tournamentId: string) => {
    const { error } = await supabase.rpc('recalculate_tournament_standings', { t_id: tournamentId });
    if (error) {
      console.error("RPC recalculateStandings error:", error);
      // Fallback or alert if RPC fails
    }
  };

  const autoAdvanceStage = async (tournamentId: string) => {
    // 1. Fetch current matches
    const { data: allMatches } = await supabase.from('matches').select('*').eq('tournamentId', tournamentId);
    if (!allMatches || allMatches.length === 0) return;

    const createMatchObject = (h: any, a: any, tId: string, rnd: string, idx: number) => ({
      tournamentId: tId,
      homePlayerId: h.id,
      homePlayerName: h.name,
      awayPlayerId: a.id,
      awayPlayerName: a.name,
      status: 'pending',
      round: rnd,
      matchIndex: idx
    });

    // 2. Identify the "latest" stage and determine if the current stage is completely done
    const stages = Array.from(new Set(allMatches.map(m => m.round))).filter(Boolean) as string[];
    const stagePriority = (s: string) => {
      const lowerS = s.toLowerCase();
      if (lowerS.startsWith('group')) return 1;
      if (lowerS === 'round 1' || lowerS === 'round of 16') return 2;
      if (lowerS === 'quarter final') return 3;
      if (lowerS === 'semi final') return 4;
      if (lowerS === 'grand final') return 5;
      return 0;
    };

    const latestStage = stages.sort((a, b) => stagePriority(b) - stagePriority(a))[0];
    const lowerStage = latestStage.toLowerCase();

    // In Hybrid mode, we must ensure ALL group stage matches are finished, not just the "latest" one alphabetically
    let stageMatches: any[] = [];
    if (lowerStage.startsWith('group')) {
      stageMatches = allMatches.filter(m => m.round?.toLowerCase().startsWith('group'));
    } else {
      stageMatches = allMatches.filter(m => m.round === latestStage);
    }

    const allCompleted = stageMatches.every(m => m.status === 'completed');
    if (!allCompleted) return;

    // 3. Determine next stage
    let nextStage = "";
    let qualifiedPlayerIds: string[] = [];

    const targetQuals = selectedTournament.target_qualifiers || 4;
    const qualsPerGroup = selectedTournament.qualifiers_per_group || 2;

    if (lowerStage.startsWith('group')) {
      // Transition from Groups to Knockout
      const groupNames = Array.from(new Set(allMatches.filter(m => m.round?.toLowerCase().startsWith('group')).map(m => m.round!.split(' ').pop()))).sort();

      const { data: players } = await supabase.from('players').select('*').eq('tournamentId', tournamentId);
      if (!players) return;

      // Group players and sort them
      const topPlayersByGroup: { [key: string]: any[] } = {};
      groupNames.forEach(gn => {
        const gp = players.filter(p => p.group === gn).sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.gd - a.gd;
        });
        topPlayersByGroup[gn] = gp.slice(0, qualsPerGroup);
      });

      if (targetQuals >= 16) nextStage = "Round 1";
      else if (targetQuals >= 8) nextStage = "Quarter Final";
      else if (targetQuals >= 4) nextStage = "Semi Final";
      else if (targetQuals >= 2) nextStage = "Grand Final";
      else return; 

      // Pair groups dynamically (G1+G2, G3+G4) and apply cross-seeding
      const newMatches: any[] = [];
      let matchIdx = allMatches.length + 1;

      for (let i = 0; i < groupNames.length; i += 2) {
        const gName1 = groupNames[i];
        const gName2 = groupNames[i + 1];

        const g1Players = topPlayersByGroup[gName1] || [];
        const g2Players = topPlayersByGroup[gName2] || [];

        if (qualsPerGroup === 2) {
          // Cross-seeding: G1 Winner vs G2 Runner-up, G2 Winner vs G1 Runner-up
          if (g1Players[0] && g2Players[1]) {
            newMatches.push(createMatchObject(g1Players[0], g2Players[1], tournamentId, nextStage, matchIdx++));
          }
          if (g2Players[0] && g1Players[1]) {
            newMatches.push(createMatchObject(g2Players[0], g1Players[1], tournamentId, nextStage, matchIdx++));
          }
        } else if (qualsPerGroup === 1) {
          // Neighbor-pairing: G1 Winner vs G2 Winner
          if (g1Players[0] && g2Players[0]) {
            newMatches.push(createMatchObject(g1Players[0], g2Players[0], tournamentId, nextStage, matchIdx++));
          }
        }
      }

      if (newMatches.length > 0) {
        await supabase.from('matches').insert(newMatches);
        alert(`Automated Advance: All groups completed. ${nextStage} fixtures have been generated with dynamic cross-seeding!`);
      }
      return; // Exit as we handled the transition
    } else if (lowerStage === "round 1" || lowerStage === "round of 16" || lowerStage === "quarter final" || lowerStage === "semi final") {
      qualifiedPlayerIds = stageMatches.sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map(m => m.homeScore > m.awayScore ? m.homePlayerId : m.awayPlayerId);
      
      if (lowerStage === "round 1" || lowerStage === "round of 16") nextStage = "Quarter Final";
      else if (lowerStage === "quarter final") nextStage = "Semi Final";
      else if (lowerStage === "semi final") nextStage = "Grand Final";
    }

    if (!nextStage || qualifiedPlayerIds.length < 2) return;

    // 4. Check if next stage already exists
    const nextStageExists = allMatches.some(m => m.round === nextStage);
    if (nextStageExists) return;

    // 5. Generate next stage matches (DETERMINISTIC BRACKET)
    const { data: playersInfo } = await supabase.from('players').select('id, name').in('id', qualifiedPlayerIds);
    if (!playersInfo) return;

    const playerMap = new Map(playersInfo.map(p => [p.id, p]));
    const orderedQualified = qualifiedPlayerIds.map(id => playerMap.get(id)).filter(Boolean);

    const newMatches = [];
    let matchIdx = allMatches.length + 1;

    for (let i = 0; i < orderedQualified.length; i += 2) {
      const p1 = orderedQualified[i];
      const p2 = orderedQualified[i + 1];
      if (p1 && p2) {
        newMatches.push({
          tournamentId,
          homePlayerId: p1.id,
          homePlayerName: p1.name,
          awayPlayerId: p2.id,
          awayPlayerName: p2.name,
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
    } else if (selectedTournament) {
      // Always recalculate standings when status changes (either to completed or away from it)
      await recalculateStandings(selectedTournament.id);
      if (newStatus === 'completed') {
        await autoAdvanceStage(selectedTournament.id);
      }
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

  const deleteAllMatches = async () => {
    if (!selectedTournament) return;
    if (window.confirm("CRITICAL: This will permanently delete ALL matches in this tournament. This cannot be undone. Are you sure?")) {
      const { error } = await supabase.from('matches').delete().eq('tournamentId', selectedTournament.id);
      if (error) {
        console.error("Delete all matches error:", error);
        alert("Failed to delete all matches: " + error.message);
      } else {
        setMatches([]);
        await recalculateStandings(selectedTournament.id);
        alert("All matches deleted and standings reset.");
      }
    }
  };

  const reseedStage = async (tournamentId: string) => {
    if (!tournamentId) return;
    
    // 1. Fetch ALL current matches
    const { data: allMatches, error: fetchError } = await supabase.from('matches').select('*').eq('tournamentId', tournamentId);
    if (fetchError || !allMatches || allMatches.length === 0) {
      alert("No matches found to re-seed.");
      return;
    }

    const stages = Array.from(new Set(allMatches.map(m => m.round))).filter(Boolean) as string[];
    const stagePriority = (s: string) => {
      const lowerS = s.toLowerCase();
      if (lowerS.startsWith('group')) return 1;
      if (lowerS === 'round 1' || lowerS === 'round of 16') return 2;
      if (lowerS === 'quarter final') return 3;
      if (lowerS === 'semi final') return 4;
      if (lowerS === 'grand final') return 5;
      return 0;
    };

    const sortedStages = stages.sort((a, b) => stagePriority(b) - stagePriority(a));
    const latestStage = sortedStages[0];

    if (!latestStage || latestStage.toLowerCase().startsWith('group')) {
      alert("Current stage is Group Stage. Use 'Fixture Wizard' to modify groups.");
      return;
    }

    if (!window.confirm(`This will RE-GENERATE all matches for "${latestStage}" based on the previous round's winners. Any results in "${latestStage}" will be lost. Proceed?`)) return;

    // 2. Delete matches of the LATEST knockout stage
    const { error: delError } = await supabase
      .from('matches')
      .delete()
      .eq('tournamentId', tournamentId)
      .eq('round', latestStage);

    if (delError) {
      alert("Failed to clear stage: " + delError.message);
      return;
    }

    // 3. Trigger auto-advance from the round before
    // autoAdvanceStage fetches the latest data itself, so it will see the previous round as completed and current round empty
    await autoAdvanceStage(tournamentId);
    alert(`Successfully re-seeded the ${latestStage} stage!`);
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
      round: newMatchData.stage,
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

  const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;

  const getNearestPowerOf2 = (n: number) => {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  };

  const finalizeWizardStep1 = (format: "knockout" | "round_robin" | "hybrid") => {
    setSelectedFormat(format);
    setFixtureWizardStep(2);

    // Default rules
    if (format === "knockout") setWizardRules(`Single Elimination: One loss and you are out.

Match Rules:
- Match duration: 15 minutes
- Extra Time: On
- Penalties: On`);
    else if (format === "round_robin") setWizardRules("Round Robin: Everyone plays everyone in the league. Winner determined by points, GD, and goals scored.");
    else setWizardRules("Hybrid: Group stage followed by Knockout bracket for the top performers.");
  };

  const calculateQualifiersPerGroup = (gCount: number, tQuals: number) => {
    if (gCount === 0) return 0;
    return Math.ceil(tQuals / gCount);
  };

  const finalizeWizardStep2 = () => {
    if (selectedFormat === 'hybrid') {
      setFixtureWizardStep(2.5); // New step for Target Qualifiers
    } else {
      finalizeToStep3();
    }
  };

  const finalizeToStep3 = () => {
    const verifiedPlayers = players.filter(p => p.status === 'approved');
    setUnassignedPlayers(verifiedPlayers);
    
    const groups: { [key: string]: any[] } = {};
    const count = (selectedFormat === "hybrid" || selectedFormat === "round_robin") ? wizardGroupCount : 1;

    for (let i = 0; i < count; i++) {
      const key = i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)) : String.fromCharCode(65 + i);
      groups[key] = [];
    }

    setGroupAssignments(groups);
    setFixtureWizardStep(3);
  };

  const handleRandomizeDraw = () => {
    setIsDrawing(true);
    setTimeout(() => {
      const allPlayers = [...unassignedPlayers];
      const newAssignments = { ...groupAssignments };
      const groupKeys = Object.keys(newAssignments);
      
      // Clear existing assignments if we're randomizing from scratch
      groupKeys.forEach(k => newAssignments[k] = []);
      
      // Shuffle players
      const shuffled = allPlayers.sort(() => Math.random() - 0.5);
      
      shuffled.forEach((p, idx) => {
        const key = groupKeys[idx % groupKeys.length];
        newAssignments[key].push(p);
      });
      
      setGroupAssignments(newAssignments);
      setUnassignedPlayers([]);
      setIsDrawing(false);
    }, 2000); // 2 second animation delay
  };

  const onDragStart = (e: React.DragEvent, player: any, source: 'unassigned' | string) => {
    e.dataTransfer.setData("playerId", player.id);
    e.dataTransfer.setData("source", source);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetGroup: 'unassigned' | string) => {
    const playerId = e.dataTransfer.getData("playerId");
    const source = e.dataTransfer.getData("source");
    
    if (source === targetGroup) return;

    let player: any;
    const newUnassigned = [...unassignedPlayers];
    const newAssignments = { ...groupAssignments };

    // Remove from source
    if (source === 'unassigned') {
      const idx = newUnassigned.findIndex(p => p.id === playerId);
      player = newUnassigned[idx];
      newUnassigned.splice(idx, 1);
    } else {
      const idx = newAssignments[source].findIndex(p => p.id === playerId);
      player = newAssignments[source][idx];
      newAssignments[source].splice(idx, 1);
    }

    // Add to target
    if (targetGroup === 'unassigned') {
      newUnassigned.push(player);
    } else {
      newAssignments[targetGroup].push(player);
    }

    setUnassignedPlayers(newUnassigned);
    setGroupAssignments(newAssignments);
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

                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
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
                          className="w-full bg-background-dark/80 backdrop-blur-md border border-white/5 rounded-2xl px-5 h-[52px] text-xs font-black uppercase tracking-widest text-white outline-none focus:border-primary/40 appearance-none cursor-pointer hover:bg-background-dark transition-colors"
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
                      className="h-[52px] w-full bg-primary text-background-dark font-black uppercase text-[10px] tracking-[0.2em] px-8 rounded-2xl hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_10px_25px_rgba(15,164,175,0.2)] active:scale-95"
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
              <Trophy className="w-6 h-6 md:w-8 md:h-8" />
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

            {/* Paid Tournament Toggle */}
            <div
              className={`p-4 rounded-2xl border mb-6 flex items-center justify-between cursor-pointer transition-all duration-300 ${selectedTournament?.isPaid ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-background-dark/50 border-white/5'}`}
              onClick={() => updateSettings("isPaid", !selectedTournament?.isPaid)}
            >
              <div className="flex flex-col">
                <span className={`text-sm font-bold uppercase tracking-tight italic ${selectedTournament?.isPaid ? 'text-yellow-400' : 'text-white/50'}`}>
                  {selectedTournament?.isPaid ? "💰 Paid Tournament" : "🆓 Free Tournament"}
                </span>
                <span className="text-[11px] text-white/30 font-extrabold uppercase tracking-tight">
                  {selectedTournament?.isPaid ? "Entry fee required — prizes shown" : "No entry, no prize shown"}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
                <input type="checkbox" className="sr-only peer" checked={!!selectedTournament?.isPaid} readOnly />
                <div className="w-12 h-6.5 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/20 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 after:peer-checked:bg-white shadow-inner"></div>
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

              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Prize Pool (₹) — Fill what applies</label>
                {[
                  { key: "prize1st", emoji: "🥇", label: "1st — Winner" },
                  { key: "prize2nd", emoji: "🥈", label: "2nd — Runner-up" },
                  { key: "prize3rd", emoji: "🥉", label: "3rd Place" },
                  { key: "prize4th", emoji: "4️⃣", label: "4th Place" },
                ].map(({ key, emoji, label }) => (
                  <div key={key} className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">{emoji}</span>
                    <input
                      value={(selectedTournament as any)?.[key] || ""}
                      onChange={(e) => updateSettings(key, e.target.value)}
                      className="w-full bg-background-dark/50 border border-white/5 text-sm font-black rounded-2xl text-white py-3 pl-10 pr-4 focus:ring-1 focus:ring-primary outline-none placeholder-white/20"
                      placeholder={label}
                    />
                  </div>
                ))}
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-orange-500" />
                </div>
                <h3 className="text-[11px] font-extrabold text-white/40 uppercase tracking-wider">Qualification Logic</h3>
              </div>
              {selectedTournament && (!selectedTournament.format || !selectedTournament.target_qualifiers) && (
                <button
                  onClick={async () => {
                    if (!selectedTournament) return;
                    const updates = {
                      format: "knockout",
                      target_qualifiers: approvedPlayers.length > 8 ? 16 : 8,
                      qualifiers_per_group: 2
                    };
                    const { error } = await supabase.from('tournaments').update(updates).eq('id', selectedTournament.id);
                    if (!error) {
                      setSelectedTournament({ ...selectedTournament, ...updates });
                      alert("Tournament metadata initialized!");
                    }
                  }}
                  className="px-3 py-1.5 bg-orange-500/20 text-orange-500 border border-orange-500/20 text-[9px] font-black uppercase rounded-lg hover:bg-orange-500/30 transition-all hover:scale-105 active:scale-95"
                >
                  Repair Metadata
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Tournament Format</label>
                <select
                  value={selectedTournament?.format || "knockout"}
                  onChange={(e) => updateSettings("format", e.target.value)}
                  className="w-full bg-background-dark/50 border border-white/5 text-xs font-bold rounded-2xl text-white p-3 focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="knockout">Single Elimination</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="hybrid">Hybrid Group Stage</option>
                </select>
              </div>

              {selectedTournament?.format === 'hybrid' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Target Total Qualifiers</label>
                    <input
                      type="number"
                      value={selectedTournament?.target_qualifiers || 4}
                      onChange={(e) => updateSettings("target_qualifiers", parseInt(e.target.value))}
                      className="w-full bg-background-dark/50 border border-white/5 text-xs font-bold rounded-2xl text-white p-3 focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Qualifiers Per Group</label>
                    <input
                      type="number"
                      value={selectedTournament?.qualifiers_per_group || 2}
                      onChange={(e) => updateSettings("qualifiers_per_group", parseInt(e.target.value))}
                      className="w-full bg-background-dark/50 border border-white/5 text-xs font-bold rounded-2xl text-white p-3 focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </>
              )}
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
                              onClick={() => setWizardGroupCount(Math.max(1, wizardGroupCount - 1))}
                              className="absolute left-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors z-10"
                            >-</button>
                            <input
                              type="number"
                              min="1"
                              max="32"
                              value={wizardGroupCount}
                              onChange={(e) => setWizardGroupCount(parseInt(e.target.value) || 1)}
                              className="w-full bg-background-dark/50 border border-primary/30 rounded-full px-12 py-4 text-center text-4xl font-black italic text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                            />
                            <button
                              onClick={() => setWizardGroupCount(wizardGroupCount + 1)}
                              className="absolute right-0 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white text-2xl font-black transition-colors z-10"
                            >+</button>
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
                              <button
                                key={type.id}
                                onClick={() => setRoundRobinType(type.id as any)}
                                className={`p-4 rounded-2xl border transition-all ${roundRobinType === type.id ? 'bg-primary border-primary text-background-dark' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}
                              >
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
                            <Settings className="w-5 h-5 animate-spin-slow" />
                            <h6 className="font-bold uppercase text-xs tracking-wider">Bracket Normalization</h6>
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-white/60 leading-relaxed">
                              Players: <span className="text-white font-bold">{players.filter(p => p.status === 'approved').length}</span>
                            </p>
                            {(() => {
                              const pCount = players.filter(p => p.status === 'approved').length;
                              const nearest = getNearestPowerOf2(pCount);
                              const byes = nearest - pCount;
                              return (
                                <div className="p-4 bg-background-dark/50 rounded-xl border border-white/5">
                                  <div className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Calculation</div>
                                  <div className="text-xs text-white/40">
                                    Target Bracket: <span className="text-white font-bold">{nearest}</span> slots
                                    <br />
                                    Byes needed: <span className="text-secondary font-black italic">{byes}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
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
                        Continue to {selectedFormat === 'hybrid' ? 'Qualification Setup' : 'Draw Engine'}
                      </button>
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
                            <button
                              key={num}
                              onClick={() => {
                                setTargetQualifiers(num);
                                setQualifiersPerGroup(calculateQualifiersPerGroup(wizardGroupCount, num));
                              }}
                              className={`p-6 rounded-2xl border transition-all ${targetQualifiers === num ? 'bg-primary border-primary text-background-dark' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/30'}`}
                            >
                              <div className="text-2xl font-black italic">{num}</div>
                              <div className="text-[9px] font-black uppercase tracking-widest mt-1">
                                {num === 2 ? 'Final' : num === 4 ? 'Semi-Finals' : num === 8 ? 'Quarter-Finals' : 'Round of 16'}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                        <div className="flex items-center gap-3 text-primary">
                          <Check className="w-5 h-5" />
                          <h6 className="font-bold uppercase text-xs tracking-wider">Automated Logic Verification</h6>
                        </div>
                        <div className="space-y-3">
                          <p className="text-sm text-white/60">
                            Groups: <span className="text-white font-bold">{wizardGroupCount}</span>
                            <span className="mx-2 text-white/20">|</span>
                            Qualifiers per Group: <span className="text-white font-bold">{qualifiersPerGroup}</span>
                          </p>
                          <div className={`p-4 rounded-xl border ${isPowerOf2(wizardGroupCount * qualifiersPerGroup) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {isPowerOf2(wizardGroupCount * qualifiersPerGroup) ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              <span className="text-[10px] font-black uppercase tracking-widest">Logic Check: {wizardGroupCount * qualifiersPerGroup} Total Qualifiers</span>
                            </div>
                            <p className="text-xs opacity-70">
                              {isPowerOf2(wizardGroupCount * qualifiersPerGroup) 
                                ? "Perfect! This creates a clean power-of-2 bracket." 
                                : `WARNING: ${wizardGroupCount * qualifiersPerGroup} is not a power of 2 (2, 4, 8, 16). Please adjust groups or qualifiers.`}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button onClick={() => setFixtureWizardStep(2)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                        Back
                      </button>
                      <button onClick={finalizeToStep3} className="flex-[2] px-8 py-4 bg-primary text-background-dark font-black uppercase text-xs tracking-widest rounded-2xl hover:brightness-110 transition-all shadow-[0_10px_25px_rgba(15,164,175,0.2)]">
                        Continue to Draw Engine
                      </button>
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
                      <button
                        onClick={handleRandomizeDraw}
                        disabled={isDrawing || unassignedPlayers.length === 0}
                        className={`px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-3 ${isDrawing ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-primary text-background-dark hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(15,164,175,0.3)]'}`}
                      >
                        {isDrawing ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Shuffling Balls...
                          </>
                        ) : (
                          <>
                            <Dices className="w-5 h-5" />
                            UCL Random Draw
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                      {/* Left Column: Approved Players */}
                      <div className="lg:col-span-1 space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h5 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Approved Players</h5>
                          <span className="text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-md font-black">{unassignedPlayers.length}</span>
                        </div>
                        <div
                          onDragOver={onDragOver}
                          onDrop={(e) => onDrop(e, 'unassigned')}
                          className="bg-white/[0.02] border border-white/10 rounded-3xl p-4 min-h-[600px] max-h-[600px] overflow-y-auto custom-scrollbar space-y-2"
                        >
                          {unassignedPlayers.map((player) => (
                            <div
                              key={player.id}
                              draggable
                              onDragStart={(e) => onDragStart(e, player, 'unassigned')}
                              className="p-4 bg-background-dark/80 border border-white/5 rounded-2xl cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                  {player.name.charAt(0)}
                                </div>
                                <span className="text-xs font-black text-white italic truncate uppercase">{player.name}</span>
                              </div>
                            </div>
                          ))}
                          {unassignedPlayers.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-white/10 py-12 text-center">
                              <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
                              <span className="text-[10px] font-black uppercase tracking-widest">All Players Assigned</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Groups/Bracket Slots */}
                      <div className="lg:col-span-3">
                        <div
                          className="grid gap-6"
                          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
                        >
                          {Object.entries(groupAssignments).map(([groupKey, groupPlayers]) => (
                            <div key={groupKey} className="space-y-4">
                              <div className="flex items-center justify-between px-2">
                                <h5 className="text-sm font-black text-primary uppercase tracking-widest italic">
                                  {selectedFormat === 'knockout' ? 'Bracket Positions' : `Group ${groupKey}`}
                                </h5>
                                <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-md font-bold">{(groupPlayers as any[]).length} Players</span>
                              </div>
                              <div
                                onDragOver={onDragOver}
                                onDrop={(e) => onDrop(e, groupKey)}
                                className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 min-h-[300px] space-y-3 transition-all hover:bg-white/[0.04] hover:border-primary/20"
                              >
                                {(groupPlayers as any[]).map((player) => (
                                  <div
                                    key={player.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, player, groupKey)}
                                    className="p-4 bg-background-dark/50 border border-white/5 rounded-2xl group flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                                        {(groupPlayers as any[]).indexOf(player) + 1}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-black text-white italic truncate uppercase">{player.name}</span>
                                        <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">SEED {(groupPlayers as any[]).indexOf(player) + 1}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        const newUnassigned = [...unassignedPlayers, player];
                                        const newAssignments = { ...groupAssignments };
                                        newAssignments[groupKey] = (newAssignments[groupKey] as any[]).filter(p => p.id !== player.id);
                                        setUnassignedPlayers(newUnassigned);
                                        setGroupAssignments(newAssignments);
                                      }}
                                      className="p-2 opacity-0 group-hover:opacity-100 hover:text-secondary transition-all"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                {(groupPlayers as any[]).length === 0 && (
                                  <div className="h-full flex flex-col items-center justify-center text-white/10 py-12">
                                    <PlusCircle className="w-8 h-8 mb-2 opacity-10" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-center">Drag players here</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-8 border-t border-white/10">
                      <button onClick={() => setFixtureWizardStep(2)} className="flex-1 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                        Back
                      </button>
                      <button
                        onClick={() => {
                          if (unassignedPlayers.length > 0) {
                            if (!window.confirm(`There are still ${unassignedPlayers.length} unassigned players. Do you want to proceed without them?`)) {
                              return;
                            }
                          }
                          
                          const generated: any[] = [];
                          let matchIdx = 1;

                          if (selectedFormat === 'round_robin' || selectedFormat === 'hybrid') {
                            Object.entries(groupAssignments).forEach(([groupKey, groupPlayers]) => {
                              const pList = [...(groupPlayers as any[])];
                              
                              for (let i = 0; i < pList.length; i++) {
                                for (let j = i + 1; j < pList.length; j++) {
                                  const p1 = pList[i];
                                  const p2 = pList[j];
                                  
                                  // Home Leg
                                  generated.push({
                                    "tournamentId": selectedTournament.id,
                                    "homePlayerId": p1.id,
                                    "homePlayerName": p1.name,
                                    "awayPlayerId": p2.id,
                                    "awayPlayerName": p2.name,
                                    status: "pending",
                                    round: selectedFormat === 'hybrid' ? `Group ${groupKey}` : 'Round Robin',
                                    stage: selectedFormat === 'hybrid' ? `Group ${groupKey}` : 'Round Robin',
                                  });

                                  // Away Leg (if double)
                                  if (roundRobinType === 'double') {
                                    generated.push({
                                      "tournamentId": selectedTournament.id,
                                      "homePlayerId": p2.id,
                                      "homePlayerName": p2.name,
                                      "awayPlayerId": p1.id,
                                      "awayPlayerName": p1.name,
                                      status: "pending",
                                      round: selectedFormat === 'hybrid' ? `Group ${groupKey}` : 'Round Robin',
                                      stage: selectedFormat === 'hybrid' ? `Group ${groupKey}` : 'Round Robin',
                                    });
                                  }
                                }
                              }
                            });
                            // Shuffle matches to interleave different groups for better schedule
                            generated.sort(() => Math.random() - 0.5);
                            generated.forEach((m, idx) => m.matchIndex = idx + 1);
                          } else if (selectedFormat === 'knockout') {
                            const pList = [...(groupAssignments['A'] as any[])];
                            const nearest = getNearestPowerOf2(pList.length);
                            
                            let roundName = "Round 1";
                            if (nearest === 4) roundName = "Semi Final";
                            else if (nearest === 8) roundName = "Quarter Final";
                            else if (nearest === 16) roundName = "Round of 16";
                            else if (nearest === 32) roundName = "Round of 32";

                            for (let i = 0; i < nearest; i += 2) {
                              const p1 = pList[i];
                              const p2 = pList[i + 1];
                              
                              if (p1 && p2) {
                                generated.push({
                                  "tournamentId": selectedTournament.id,
                                  "homePlayerId": p1.id,
                                  "homePlayerName": p1.name,
                                  "awayPlayerId": p2.id,
                                  "awayPlayerName": p2.name,
                                  status: "pending",
                                  round: roundName,
                                  stage: roundName,
                                  "matchIndex": matchIdx++
                                });
                              } else if (p1) {
                                generated.push({
                                  "tournamentId": selectedTournament.id,
                                  "homePlayerId": p1.id,
                                  "homePlayerName": p1.name,
                                  "awayPlayerId": "bye",
                                  "awayPlayerName": "BYE",
                                  status: "completed",
                                  "homeScore": 3,
                                  "awayScore": 0,
                                  round: roundName,
                                  stage: roundName,
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
                      <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="flex items-center justify-between px-2">
                          <h5 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Generated Fixtures</h5>
                          <button
                            onClick={() => {
                              const newMatches = [...wizardMatches];
                              const nextIdx = newMatches.length + 1;
                              newMatches.push({
                                "tournamentId": selectedTournament.id,
                                "homePlayerId": players.filter(p => p.status === 'approved')[0]?.id || 'bye',
                                "homePlayerName": players.filter(p => p.status === 'approved')[0]?.name || 'BYE',
                                "awayPlayerId": 'bye',
                                "awayPlayerName": "BYE",
                                status: "pending",
                                round: "Bonus Match",
                                stage: "Bonus Match",
                                "matchIndex": nextIdx
                              });
                              setWizardMatches(newMatches);
                              if (drawnMatchCount >= wizardMatches.length) setDrawnMatchCount(nextIdx);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Add Bonus Match
                          </button>
                        </div>
                        <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden max-h-[500px] flex flex-col">
                          <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left">
                            <thead className="bg-white/[0.02] text-[10px] text-white/30 uppercase tracking-[0.2em]">
                              <tr>
                                <th className="px-8 py-4 font-black">#</th>
                                <th className="px-8 py-4 font-black">Round</th>
                                <th className="px-8 py-4 font-black text-right">Home Player</th>
                                <th className="px-8 py-4 font-black text-center">VS</th>
                                <th className="px-8 py-4 font-black">Away Player</th>
                                <th className="px-8 py-4 font-black text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {wizardMatches.slice(0, Math.max(drawnMatchCount, wizardMatches.length)).map((match, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group animate-in slide-in-from-left-4 fade-in duration-300">
                                  <td className="px-8 py-4 text-xs font-bold text-white/20">{match.matchIndex || idx + 1}</td>
                                  <td className="px-8 py-4">
                                    <input
                                      type="text"
                                      className="bg-transparent text-[10px] font-black uppercase text-primary tracking-wider outline-none border-b border-transparent focus:border-primary/30 w-24"
                                      value={match.round}
                                      onChange={(e) => {
                                        const newMatches = [...wizardMatches];
                                        newMatches[idx] = { ...match, round: e.target.value, stage: e.target.value };
                                        setWizardMatches(newMatches);
                                      }}
                                    />
                                  </td>
                                  <td className="px-8 py-4 text-right">
                                    <select
                                      className="bg-transparent text-sm font-bold text-white/70 italic text-right outline-none cursor-pointer hover:text-white"
                                      value={match.homePlayerId}
                                      onChange={(e) => {
                                        const targetId = e.target.value;
                                        const targetName = targetId === "bye" ? "BYE" : players.find(p => p.id === targetId)?.name || "Unknown";
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
                                        const targetName = targetId === "bye" ? "BYE" : players.find(p => p.id === targetId)?.name || "Unknown";
                                        const newMatches = [...wizardMatches];
                                        newMatches[idx] = { ...match, awayPlayerId: targetId, awayPlayerName: targetName };
                                        setWizardMatches(newMatches);
                                      }}
                                    >
                                      {players.filter(p => p.status === 'approved').map(p => <option key={p.id} value={p.id} className="bg-background-dark">{p.name}</option>)}
                                      <option value="bye" className="bg-background-dark">BYE</option>
                                    </select>
                                  </td>
                                  <td className="px-8 py-4 text-center">
                                    <button
                                      onClick={() => {
                                        const newMatches = wizardMatches.filter((_, i) => i !== idx);
                                        newMatches.forEach((m, i) => m.matchIndex = i + 1);
                                        setWizardMatches(newMatches);
                                        if (drawnMatchCount > newMatches.length) setDrawnMatchCount(newMatches.length);
                                      }}
                                      className="p-2 text-white/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </div>
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
                                  <button
                        onClick={async () => {
                          if (isLaunching) return;
                          
                          // Final safety check: if matches already exist, don't insert again
                          if (matches.length > 0) {
                            if (!window.confirm("Matches already exist for this tournament. Launching again will create duplicates. Are you sure?")) {
                              return;
                            }
                          }

                          setIsLaunching(true);
                          try {
                            const { error: matchError } = await supabase.from('matches').insert(wizardMatches);
                            if (matchError) {
                              alert("Failed to insert matches: " + matchError.message);
                              setIsLaunching(false);
                              return;
                            }

                            // Update player groups based on wizard assignments
                            for (const [groupKey, groupPlayers] of Object.entries(groupAssignments)) {
                              const pIds = (groupPlayers as any[]).map(p => p.id);
                              if (pIds.length > 0) {
                                const { error: pError } = await supabase
                                  .from('players')
                                  .update({ "group": groupKey })
                                  .in('id', pIds);
                                if (pError) console.error(`Error updating group ${groupKey}:`, pError);
                              }
                            }

                            // Update tournament status and rules
                            await updateSettings("activeStage", selectedFormat === 'knockout' ? 'knockout' : 'groups');
                            await updateSettings("rules", wizardRules);
                            await updateSettings("groupCount", wizardGroupCount);
                            await updateSettings("format", selectedFormat);
                            await updateSettings("target_qualifiers", targetQualifiers);
                            await updateSettings("qualifiers_per_group", qualifiersPerGroup);

                            setIsGeneratingFixtures(false);
                            setShowSuccessModal(true);
                          } catch (err) {
                            console.error("Launch error:", err);
                          } finally {
                            setIsLaunching(false);
                          }
                        }}
                        disabled={isLaunching}
                        className={`flex-[2] px-8 py-4 ${isLaunching ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-secondary text-white hover:brightness-110 shadow-[0_10px_25px_rgba(239,68,68,0.2)]'} font-black uppercase text-xs tracking-widest rounded-2xl transition-all`}
                      >
                        {isLaunching ? 'Launching...' : '🚀 Launch Tournament'}
                      </button>
� Launch Tournament
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
            <div className="p-5 md:p-7 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.02] gap-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="text-primary w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Player Management</h3>
                  <p className="text-[10px] md:text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{pendingPlayers.length} Pending Approval</p>
                </div>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => setShowManualPlayerForm(true)} className="w-full md:w-auto bg-white/5 text-white font-extrabold uppercase text-[10px] md:text-[11px] tracking-wider px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Manual Entry
                </button>
              </div>
            </div>

            {showManualPlayerForm && (
              <form onSubmit={handleManualAddPlayer} className="p-7 bg-primary/[0.03] border-b border-white/5 grid grid-cols-1 md:grid-cols-4 gap-6 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">Full Name</label>
                  <input required value={manualPlayerData.name} onChange={e => setManualPlayerData({ ...manualPlayerData, name: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="e.g. Cristiano" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">eFootball User ID (Optional)</label>
                  <input value={manualPlayerData.efootballId} onChange={e => setManualPlayerData({ ...manualPlayerData, efootballId: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="000-000-000" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-[0.2em] ml-1">WhatsApp No. (Optional)</label>
                  <input value={manualPlayerData.phone} onChange={e => setManualPlayerData({ ...manualPlayerData, phone: e.target.value })} className="bg-background-dark/80 border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white font-bold focus:border-primary/50 outline-none" placeholder="+91 ..." />
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Match Center */}
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
                  <button type="submit" className="h-[46px] bg-primary text-background-dark font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10">Add Match</button>
                </form>
              )}
              <div className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-hide">
                {matches.sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map(match => (
                  <div key={match.id} className="p-4 bg-background-dark/50 border border-white/5 rounded-2xl hover:border-primary/20 transition-all group relative">
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
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Home Player */}
                      <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                        <div className="flex flex-col items-end min-w-0">
                          {overrideMode ? (
                            <select
                              value={match.homePlayerId || ''}
                              onChange={(e) => {
                                const targetId = e.target.value;
                                const targetName = players.find(p => p.id === targetId)?.name || "TBD";
                                updateMatchDetails(match.id, { homePlayerId: targetId, homePlayerName: targetName });
                              }}
                              className="bg-background-dark border border-white/5 rounded-xl px-2 py-1 text-[10px] text-white font-bold outline-none text-right w-full max-w-[120px]"
                            >
                              <option value="">Select Home</option>
                              {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{match.homePlayerName}</span>
                          )}
                          {!overrideMode && <span className="text-[9px] text-white/30 font-black uppercase tracking-wider">{match.stage || "Home"}</span>}
                        </div>
                      </div>

                      {/* Center: Score & Status */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl px-2 py-1 gap-2">
                          <input
                            type="number"
                            defaultValue={match.homeScore}
                            onBlur={(e) => updateMatchScore(match.id, parseInt(e.target.value) || 0, match.awayScore)}
                            className="w-10 h-10 bg-transparent text-center text-primary font-black text-lg focus:text-white outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-white/20 font-black text-lg italic">:</span>
                          <input
                            type="number"
                            defaultValue={match.awayScore}
                            onBlur={(e) => updateMatchScore(match.id, match.homeScore, parseInt(e.target.value) || 0)}
                            className="w-10 h-10 bg-transparent text-center text-primary font-black text-lg focus:text-white outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        
                        <button
                          onClick={() => toggleMatchStatus(match.id, match.status)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black uppercase shadow-lg transition-all hover:scale-110 active:scale-95 border border-white/10 ${match.status === 'completed'
                              ? 'bg-secondary text-white border-secondary/20'
                              : 'bg-white/5 text-white/30 hover:bg-white/10'
                            }`}
                        >
                          {match.status === 'completed' ? 'FT' : 'TBD'}
                        </button>
                      </div>

                      {/* Right: Away Player */}
                      <div className="flex-1 flex items-center justify-start gap-3 min-w-0">
                        <div className="flex flex-col items-start min-w-0">
                          {overrideMode ? (
                            <select
                              value={match.awayPlayerId || ''}
                              onChange={(e) => {
                                const targetId = e.target.value;
                                const targetName = players.find(p => p.id === targetId)?.name || "TBD";
                                updateMatchDetails(match.id, { awayPlayerId: targetId, awayPlayerName: targetName });
                              }}
                              className="bg-background-dark border border-white/5 rounded-xl px-2 py-1 text-[10px] text-white font-bold outline-none w-full max-w-[120px]"
                            >
                              <option value="">Select Away</option>
                              {approvedPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          ) : (
                            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">{match.awayPlayerName}</span>
                          )}
                          {!overrideMode && <span className="text-[9px] text-white/30 font-black uppercase tracking-wider">{match.group ? `Grp ${match.group}` : 'Away'}</span>}
                        </div>
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
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-all border ${overrideMode
                      ? 'bg-primary/20 text-primary border-primary/20 animate-pulse'
                      : 'bg-white/5 text-white/40 border-white/5 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {overrideMode ? 'Live Editing Mode' : 'Viewing Mode'}
                </button>
              </div>
              <div className="overflow-x-auto flex-1 custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-white/[0.02] text-[11px] text-white/40 uppercase tracking-wider">
                    <tr>
                      <th className="px-8 py-5 font-black">Player Name</th>
                      <th className="px-8 py-5 font-black text-center">Group</th>
                      <th className="px-8 py-5 font-black text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {approvedPlayers.map(player => (
                      <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-3">
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
                      <tr><td colSpan={3} className="px-8 py-16 text-center text-white/20 italic text-sm">Roster is empty.</td></tr>
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

