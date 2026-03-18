import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { v4 as uuidv4 } from "uuid";
import { Trophy, Settings, Users, Check, X, LogOut, Edit3, Save, RefreshCw, Plus, Trash2, Eye, EyeOff, ArrowRightLeft, Dices, CheckCircle2, PlusCircle, ChevronLeft, LayoutGrid } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import TournamentList from "../components/admin/TournamentList";
import FixtureWizard from "../components/admin/FixtureWizard";
import PlayerManagement from "../components/admin/PlayerManagement";
import MatchCenter from "../components/admin/MatchCenter";
import StandingsOverride from "../components/admin/StandingsOverride";
import confetti from "canvas-confetti";

export default function AdminDashboard() {
  const { id: urlTourneyId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
  const [activeTab, setActiveTab] = useState("players");

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
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'alert' });

  const showAlert = (title: string, message: string) => {
    setDialog({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const [showNewMatchForm, setShowNewMatchForm] = useState(false);
  const [newMatchData, setNewMatchData] = useState({ homePlayerId: "", awayPlayerId: "", stage: "Knockout" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) {
        setIsAdmin(true);
      }
      if (session?.user?.email?.toLowerCase() === "efootballtournament11@gmail.com") {
        setIsSuperAdmin(true);
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
        if (session.user.email?.toLowerCase() === "efootballtournament11@gmail.com") {
          setIsSuperAdmin(true);
        }
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
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
        email: email.trim(),
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
      showAlert("Update Error", "Failed to update player status: " + error.message);
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
      showAlert("Update Error", "Failed to update settings: " + error.message);
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
      showAlert("Update Error", "Failed to update match score: " + error.message);
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
        showAlert("Automated Advance", `All groups completed. ${nextStage} fixtures have been generated with dynamic cross-seeding!`);
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
      showAlert("Automated Advance", `All ${latestStage} matches completed. ${nextStage} fixtures have been randomized and generated!`);
    }
  };

  const toggleMatchStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    // Optimistic update
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));

    const { error } = await supabase.from('matches').update({ status: newStatus }).eq('id', id);
    if (error) {
      console.error("Toggle match status error:", error);
      showAlert("Update Error", "Failed to toggle match status: " + error.message);
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
      showAlert("Update Error", "Failed to update player stats: " + error.message);
    }
  };

  const deletePlayer = async (id: string) => {
    showConfirm(
      "Confirm Deletion",
      "Are you sure you want to permanently delete this player?",
      async () => {
        // Optimistic delete
        setPlayers(prev => prev.filter(p => p.id !== id));

        const { error } = await supabase.from('players').delete().eq('id', id);
        if (error) {
          console.error("Delete player error:", error);
          showAlert("Delete Error", "Failed to delete player: " + error.message);
        }
      }
    );
  };

  const deleteMatch = async (id: string) => {
    showConfirm(
      "Confirm Deletion",
      "Are you sure you want to delete this match?",
      async () => {
        setMatches(prev => prev.filter(m => m.id !== id));
        const { error } = await supabase.from('matches').delete().eq('id', id);
        if (error) {
          console.error("Delete match error:", error);
          showAlert("Delete Error", "Failed to delete match: " + error.message);
        }
      }
    );
  };

  const deleteAllMatches = async () => {
    if (!selectedTournament) return;
    showConfirm(
      "CRITICAL: Wipe Matches",
      "This will permanently delete ALL matches in this tournament. This cannot be undone. Are you sure?",
      async () => {
        const { error } = await supabase.from('matches').delete().eq('tournamentId', selectedTournament.id);
        if (error) {
          console.error("Delete all matches error:", error);
          showAlert("Delete Error", "Failed to delete all matches: " + error.message);
        } else {
          setMatches([]);
          await recalculateStandings(selectedTournament.id);
          showAlert("Format Reset", "All matches deleted and standings reset.");
        }
      }
    );
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
      showAlert("Note", "Current stage is Group Stage. Use 'Fixture Wizard' to modify groups.");
      return;
    }

    showConfirm(
      "Confirm Re-seed",
      `This will RE-GENERATE all matches for "${latestStage}" based on the previous round's winners. Any results in "${latestStage}" will be lost. Proceed?`,
      async () => {
        // 2. Delete matches of the LATEST knockout stage
        const { error: delError } = await supabase
          .from('matches')
          .delete()
          .eq('tournamentId', tournamentId)
          .eq('round', latestStage);

        if (delError) {
          showAlert("Error", "Failed to clear stage: " + delError.message);
          return;
        }

        // 3. Trigger auto-advance from the round before
        await autoAdvanceStage(tournamentId);
        showAlert("Success", `Successfully re-seeded the ${latestStage} stage!`);
      }
    );
  };

  const updateMatchDetails = async (id: string, updates: any) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    const { error } = await supabase.from('matches').update(updates).eq('id', id);
    if (error) {
      console.error("Update match details error:", error);
      showAlert("Update Error", "Failed to update match details: " + error.message);
    }
  };

  const createCustomMatch = async (e: any) => {
    e.preventDefault();
    if (!selectedTournament) return;

    if (newMatchData.homePlayerId === newMatchData.awayPlayerId) {
      showAlert("Invalid Match", "A player cannot play against themselves.");
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
      showAlert("Create Error", "Failed to create match: " + error.message);
    } else {
      setShowNewMatchForm(false);
      setNewMatchData({ homePlayerId: "", awayPlayerId: "", stage: "Knockout" });
    }
  };

  const deleteTournament = async (e: any, t: any) => {
    e.stopPropagation();
    showConfirm(
      "Confirm Deletion",
      `WARNING: Are you sure you want to completely delete "${t.name}"? This cannot be undone.`,
      async () => {
        const id = t.id;
        // Optimistic delete
        setTournaments(prev => prev.filter(t => t.id !== id));
        if (selectedTournament?.id === id) {
          setSelectedTournament(null);
          navigate("/admin");
        }

        const { error } = await supabase.from('tournaments').delete().eq('id', id);
        if (error) {
          console.error("Delete tournament error:", error);
          showAlert("Delete Error", "Failed to delete tournament: " + error.message);
        }
      }
    );
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
      showAlert("Update Error", "Failed to toggle visibility: " + error.message);
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

  const performLaunch = async () => {
    setIsLaunching(true);
    try {
      const { error: matchError } = await supabase.from('matches').insert(wizardMatches);
      if (matchError) {
        showAlert("Launch Error", "Failed to insert matches: " + matchError.message);
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
      showAlert("Launch Error", "An unexpected error occurred during launch.");
    } finally {
      setIsLaunching(false);
    }
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
      showAlert("Add Error", "Failed to add player: " + error.message);
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
  const createTournament = async () => {
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
  };

  const approvedPlayers = players.filter(p => p.status === "approved");

  const handleBack = () => {
    if (selectedTournament) {
      setSelectedTournament(null);
    } else if (window.history.length <= 1) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-dark text-slate-100">
      {!selectedTournament ? (
        <TournamentList 
          tournaments={tournaments}
          loading={loading}
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          newTourneyName={newTourneyName}
          setNewTourneyName={setNewTourneyName}
          handleBack={handleBack}
          handleLogout={handleLogout}
          toggleTournamentVisibility={toggleTournamentVisibility}
          deleteTournament={deleteTournament}
          setTournaments={setTournaments}
          setSelectedTournament={setSelectedTournament}
          setEditTitleValue={setEditTitleValue}
          createTournament={createTournament}
          isSuperAdmin={isSuperAdmin}
          navigate={navigate}
          supabase={supabase}
        />
      ) : (
        <>
          <header className="sticky top-0 z-50 border-b border-primary/10 bg-background-dark/80 backdrop-blur-md px-6 py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-primary/10 rounded-full transition-colors text-slate-400 hover:text-primary"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Trophy className="text-primary w-8 h-8" />
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
                  <h2 className="text-sm md:text-xl font-black tracking-tighter uppercase italic flex items-center gap-2 group cursor-pointer" onClick={() => overrideMode && setIsEditingTitle(true)}>
                    {selectedTournament?.name}
                    {overrideMode && <Edit3 className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </h2>
                )}
              </div>
              <span className="text-[11px] text-white/30 font-extrabold uppercase tracking-wider -mt-1">eFootball Admin Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
              className={`p-4 rounded-2xl border mb-6 flex items-center justify-between transition-all duration-300 ${isSuperAdmin ? 'cursor-pointer' : 'opacity-80 pointer-events-none'} ${selectedTournament?.isPaid ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-background-dark/50 border-white/5'}`}
              onClick={() => isSuperAdmin && updateSettings("isPaid", !selectedTournament?.isPaid)}
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

            <div className={`space-y-4 md:space-y-5 ${!overrideMode ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-1 md:space-y-2">
                <label className="text-[9px] md:text-[11px] font-extrabold text-white/40 uppercase tracking-wider ml-1">Current Live Phase</label>
                <div className="relative">
                  <select
                    disabled={!isSuperAdmin || !overrideMode}
                    value={selectedTournament?.activeStage || "registration"}
                    onChange={(e) => updateSettings("activeStage", e.target.value)}
                    className="w-full bg-background-dark/50 border border-white/5 text-[12px] md:text-sm font-bold rounded-xl md:rounded-2xl text-white p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer hover:bg-background-dark transition-colors disabled:opacity-50"
                  >
                    <option value="registration">Registration</option>
                    <option value="draw">Draw</option>
                    <option value="groups">Group Stage</option>
                    <option value="knockout">Knockout Stage</option>
                  </select>
                  <ArrowRightLeft className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/20 rotate-90" />
                </div>
              </div>

              <div className="space-y-1 md:space-y-2">
                <label className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Registration Fee (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black">₹</span>
                  <input
                    disabled={!isSuperAdmin || !overrideMode}
                    value={selectedTournament?.entryFee || ""}
                    onChange={(e) => updateSettings("entryFee", e.target.value)}
                    className="w-full bg-background-dark/50 border border-white/5 text-[12px] md:text-sm font-black rounded-xl md:rounded-2xl text-white py-3 md:py-4 pl-8 pr-4 focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                    placeholder="0 for Free"
                  />
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                <label className="text-[9px] md:text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-1">Prize Pool (₹)</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "prize1st", emoji: "🥇" },
                    { key: "prize2nd", emoji: "🥈" },
                    { key: "prize3rd", emoji: "🥉" },
                    { key: "prize4th", emoji: "4️⃣" },
                  ].map(({ key, emoji }) => (
                    <div key={key} className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none">{emoji}</span>
                      <input
                        disabled={!isSuperAdmin || !overrideMode}
                        value={(selectedTournament as any)?.[key] || ""}
                        onChange={(e) => updateSettings(key, e.target.value)}
                        className="w-full bg-background-dark/50 border border-white/5 text-[11px] md:text-sm font-black rounded-xl text-white py-2.5 pl-9 pr-3 focus:ring-1 focus:ring-primary outline-none placeholder-white/10 disabled:opacity-50"
                        placeholder="₹0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 md:space-y-2 text-white/30">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] ml-1">Payment UPI</label>
                <input
                  disabled={!isSuperAdmin || !overrideMode}
                  value={selectedTournament?.paymentNumber || ""}
                  onChange={(e) => updateSettings("paymentNumber", e.target.value)}
                  className="w-full bg-background-dark/50 border border-white/5 text-[12px] md:text-sm font-bold rounded-xl md:rounded-2xl text-white p-3 md:p-4 focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
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
              {isSuperAdmin && selectedTournament && (!selectedTournament.format || !selectedTournament.target_qualifiers) && (
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
                  disabled={!isSuperAdmin}
                  value={selectedTournament?.format || "knockout"}
                  onChange={(e) => updateSettings("format", e.target.value)}
                  className="w-full bg-background-dark/50 border border-white/5 text-xs font-bold rounded-2xl text-white p-3 focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
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
                      disabled={!isSuperAdmin}
                      type="number"
                      value={selectedTournament?.target_qualifiers || 4}
                      onChange={(e) => updateSettings("target_qualifiers", parseInt(e.target.value))}
                      className="w-full bg-background-dark/50 border border-white/5 text-xs font-bold rounded-2xl text-white p-3 focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Qualifiers Per Group</label>
                    <input
                      disabled={!isSuperAdmin}
                      type="number"
                      value={selectedTournament?.qualifiers_per_group || 2}
                      onChange={(e) => updateSettings("qualifiers_per_group", parseInt(e.target.value))}
                      className="w-full bg-background-dark/50 border border-white/5 text-xs font-bold rounded-2xl text-white p-3 focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
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
              disabled={!isSuperAdmin}
              value={selectedTournament?.rules || ""}
              onChange={(e) => setSelectedTournament({ ...selectedTournament, rules: e.target.value })}
              className="w-full bg-background-dark/50 border border-white/5 rounded-2xl text-[13px] text-white/80 p-5 focus:ring-1 focus:ring-secondary outline-none resize-none h-48 leading-relaxed mb-4 scrollbar-hide disabled:opacity-50"
              placeholder="Define tournament rules..."
            />
            {isSuperAdmin && (
              <button
                onClick={() => updateSettings("rules", selectedTournament.rules)}
                className="w-full py-4 bg-secondary text-white text-[11px] font-extrabold uppercase tracking-wider px-5 py-2.5xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(239,68,68,0.2)]"
              >
                <Save className="w-4 h-4" /> Save Rules Update
              </button>
            )}
          </div>
        </aside>
        {isGeneratingFixtures && (
          <FixtureWizard 
            fixtureWizardStep={fixtureWizardStep}
            setFixtureWizardStep={setFixtureWizardStep}
            selectedFormat={selectedFormat || 'knockout'}
            setSelectedFormat={(format) => setSelectedFormat(format as any)}
            wizardGroupCount={wizardGroupCount}
            setWizardGroupCount={setWizardGroupCount}
            roundRobinType={roundRobinType}
            setRoundRobinType={setRoundRobinType}
            targetQualifiers={targetQualifiers}
            setTargetQualifiers={setTargetQualifiers}
            qualifiersPerGroup={qualifiersPerGroup}
            setQualifiersPerGroup={setQualifiersPerGroup}
            unassignedPlayers={unassignedPlayers}
            setUnassignedPlayers={setUnassignedPlayers}
            groupAssignments={groupAssignments}
            setGroupAssignments={setGroupAssignments}
            wizardMatches={wizardMatches}
            setWizardMatches={setWizardMatches}
            drawnMatchCount={drawnMatchCount}
            setDrawnMatchCount={setDrawnMatchCount}
            isDrawing={isDrawing}
            isMatchDrawing={isMatchDrawing}
            setIsMatchDrawing={setIsMatchDrawing}
            shuffleNames={shuffleNames}
            setShuffleNames={setShuffleNames}
            players={players}
            selectedTournament={selectedTournament}
            finalizeWizardStep2={finalizeWizardStep2}
            finalizeToStep3={finalizeToStep3}
            handleRandomizeDraw={handleRandomizeDraw}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            getNearestPowerOf2={getNearestPowerOf2}
            calculateQualifiersPerGroup={calculateQualifiersPerGroup}
            isPowerOf2={isPowerOf2}
            finalizeTournament={async () => {
              if (isLaunching) return;
              setIsLaunching(true);
              
              const { error: matchesError } = await supabase.from('matches').insert(wizardMatches);
              if (matchesError) {
                alert("Failed to deploy fixtures: " + matchesError.message);
                setIsLaunching(false);
                return;
              }

              const playerUpdates = [];
              for (const [groupName, groupPlayers] of Object.entries(groupAssignments)) {
                (groupPlayers as any[]).forEach(player => {
                  playerUpdates.push(supabase.from('players').update({ group: groupName }).eq('id', player.id));
                });
              }
              await Promise.all(playerUpdates);

              const nearest = getNearestPowerOf2(players.filter(p => p.status === 'approved').length);
              const tQuals = selectedFormat === 'hybrid' ? targetQualifiers : nearest;
              
              await supabase.from('tournaments').update({ 
                format: selectedFormat,
                groupCount: wizardGroupCount,
                qualifiers_per_group: qualifiersPerGroup,
                target_qualifiers: tQuals,
                activeStage: selectedFormat === 'knockout' ? 'knockout' : 'groups'
              }).eq('id', selectedTournament.id);

              confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0fa4af', '#964734', '#ffffff']
              });
              
              window.location.reload();
            }}
            onClose={() => setIsGeneratingFixtures(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-px mb-6 custom-scrollbar">
            {[
              { id: "players", label: "Player Management", icon: Users },
              { id: "matches", label: "Match Center", icon: Trophy },
              { id: "board", label: "Board Override", icon: LayoutGrid },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-2 px-6 py-4 border-b-2 transition-all min-w-[120px] ${
                  activeTab === tab.id 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary' : 'text-white/40'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === "players" && (
              <PlayerManagement 
                pendingPlayers={pendingPlayers}
                showManualPlayerForm={showManualPlayerForm}
                setShowManualPlayerForm={setShowManualPlayerForm}
                manualPlayerData={manualPlayerData}
                setManualPlayerData={setManualPlayerData}
                handleManualAddPlayer={handleManualAddPlayer}
                updatePlayerStatus={updatePlayerStatus}
                overrideMode={overrideMode}
                isSuperAdmin={isSuperAdmin}
              />
            )}

            {activeTab === "matches" && (
              <MatchCenter 
                matches={matches}
                approvedPlayers={approvedPlayers}
                selectedTournament={selectedTournament}
                generateFixtures={generateFixtures}
                deleteAllMatches={deleteAllMatches}
                reseedStage={reseedStage}
                overrideMode={overrideMode}
                showNewMatchForm={showNewMatchForm}
                setShowNewMatchForm={setShowNewMatchForm}
                createCustomMatch={createCustomMatch}
                newMatchData={newMatchData}
                setNewMatchData={setNewMatchData}
                toggleMatchStatus={toggleMatchStatus}
                updateMatchScore={updateMatchScore}
                deleteMatch={deleteMatch}
                updateMatchDetails={updateMatchDetails}
                isSuperAdmin={isSuperAdmin}
              />
            )}

            {activeTab === "board" && (
              <StandingsOverride 
                approvedPlayers={approvedPlayers}
                overrideMode={overrideMode}
                setOverrideMode={setOverrideMode}
                updatePlayerStats={updatePlayerStats}
                deletePlayer={deletePlayer}
                onDeletePlayer={deletePlayer}
                onEditPlayer={async (id, newName) => { await updatePlayerStats(id, "name", newName); }}
                isSuperAdmin={isSuperAdmin}
              />
            )}
          </div>
        </main>
      </div>
    </>
      )}
      {/* Custom Dialog */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm glass-panel p-8 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center gap-6">
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center ${dialog.type === 'confirm' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                {dialog.type === 'confirm' ? <Trash2 className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">{dialog.title}</h3>
                <p className="text-white/40 text-sm font-medium leading-relaxed">{dialog.message}</p>
              </div>
              <div className="flex gap-3 w-full">
                {dialog.type === 'confirm' && (
                  <button
                    onClick={() => setDialog({ ...dialog, isOpen: false })}
                    className="flex-1 px-6 py-4 bg-white/5 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={() => {
                    if (dialog.type === 'confirm' && dialog.onConfirm) {
                      dialog.onConfirm();
                    }
                    setDialog({ ...dialog, isOpen: false });
                  }}
                  className={`flex-1 px-6 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all ${dialog.type === 'confirm' ? 'bg-secondary text-white hover:brightness-110 shadow-lg shadow-secondary/10' : 'bg-primary text-background-dark hover:brightness-110 shadow-lg shadow-primary/10'}`}
                >
                  {dialog.type === 'confirm' ? 'Confirm' : 'Got it'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="w-full max-w-md glass-panel p-10 rounded-[3rem] border border-primary/20 shadow-[0_0_50px_rgba(15,164,175,0.2)] animate-in zoom-in-95 duration-500 text-center space-y-8">
            <div className="relative">
              <div className="w-24 h-24 bg-primary/20 text-primary rounded-[2rem] flex items-center justify-center mx-auto animate-bounce">
                <Trophy className="w-12 h-12" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-primary/40 rounded-[2rem] animate-ping opacity-20"></div>
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Tournament Live!</h2>
              <p className="text-white/40 text-sm font-medium leading-relaxed">The arena is ready. All fixtures have been generated and the public board is now live.</p>
            </div>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate(`/tournament/${selectedTournament?.id || selectedTournament?.name}`);
              }}
              className="w-full px-8 py-5 bg-primary text-background-dark font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_20px_40px_rgba(15,164,175,0.3)]"
            >
              Go to Public View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

