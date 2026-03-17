import React, { useState, useEffect, useMemo, Fragment } from "react";
import { supabase } from "../supabase";
import { Trophy, Info, Users, Shield, Calendar, ChevronLeft, LayoutGrid, List, CheckCircle2, XCircle, MinusCircle, ChevronDown } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import confetti from 'canvas-confetti';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length <= 1) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };
  const [rules, setRules] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState("registration");
  const [activeTab, setActiveTab] = useState("overview");
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStart;

    // Swipe left to right (diff > 100)
    if (diff > 100) {
      navigate('/tournament');
      setTouchStart(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  useEffect(() => {
    const fetchTournament = async () => {
      let data: any[] | null = null;
      let error: Error | null = null;

      if (id) {
        const decodedId = decodeURIComponent(id);
        const result = await supabase.from('tournaments').select('*').or(`id.eq.${decodedId},name.eq.${decodedId}`);
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase.from('tournaments').select('*').eq('isHidden', false).order('createdAt', { ascending: false }).limit(1);
        data = result.data;
        error = result.error;
      }

      if (data && data.length > 0) {
        const target = data[0];
        setActiveTournament(target);
        setRules(target.rules || "");
        setActiveStage(target.activeStage || "registration");
      }
    };

    fetchTournament();

    const channel = supabase.channel('details_tournament')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchTournament)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (!activeTournament) return;

    const fetchData = async () => {
      const { data: pData } = await supabase
        .from('players')
        .select('id, name, phone, efootballId, status, group, points, gd, gf, ga, played, wins, draws, losses')
        .eq('status', 'approved')
        .eq('tournamentId', activeTournament.id);

      const { data: mData } = await supabase
        .from('matches')
        .select('id, homePlayerId, awayPlayerId, homePlayerName, awayPlayerName, homeScore, awayScore, status, round, matchIndex')
        .eq('tournamentId', activeTournament.id);

      if (mData) setMatches(mData);

      if (pData) {
        // Calculate GF/GA on the fly for public view robustness
        const enrichedPlayers = pData.map(player => {
          const playerMatches = (mData || []).filter(m => 
            m.status === 'completed' && 
            (m.homePlayerId === player.id || m.awayPlayerId === player.id)
          );
          
          let gf = 0;
          let ga = 0;
          playerMatches.forEach(m => {
            if (m.homePlayerId === player.id) {
              gf += (m.homeScore || 0);
              ga += (m.awayScore || 0);
            } else {
              gf += (m.awayScore || 0);
              ga += (m.homeScore || 0);
            }
          });

          return { ...player, gf, ga, gd: gf - ga };
        });
        setPlayers(enrichedPlayers);
      }
    };

    fetchData();

    const playerChannel = supabase.channel('details_players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `tournamentId=eq.${activeTournament.id}` }, fetchData)
      .subscribe();

    const matchChannel = supabase.channel('details_matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournamentId=eq.${activeTournament.id}` }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [activeTournament?.id]);

  const groups = useMemo(() => 
    Array.from(new Set(players.filter(p => p.group && p.group !== "None").map(p => p.group as string))).sort(),
    [players]
  );

  const groupedPlayers = useMemo(() => 
    groups.reduce((acc: Record<string, any[]>, group: string) => {
      acc[group] = players.filter(p => p.group === group).sort((a, b) => b.points - a.points || b.gd - a.gd);
      return acc;
    }, {}),
    [groups, players]
  );

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "bracket", label: "Bracket", icon: Trophy },
    { id: "fixtures", label: "Fixtures", icon: Calendar },
    { id: "standings", label: "Standings", icon: LayoutGrid },
    { id: "players", label: "Players", icon: Users },
  ];

  return (
    <div 
      className="min-h-screen flex flex-col custom-scrollbar"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <header className="flex items-center justify-between border-b border-primary/20 px-4 md:px-20 py-4 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-primary/10 rounded-full transition-colors text-background-light/70 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <Trophy className="text-primary w-8 h-8" />
          <h2 className="text-xl font-bold hidden sm:block">{activeTournament?.name || "Tournament Details"}</h2>
        </div>
        <div className="flex gap-4">
          <Link to="/register" className="px-4 py-2 bg-secondary text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-[0_0_10px_rgba(150,71,52,0.4)]">
            Register Now
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-20 py-6 md:py-8 max-w-[1400px] mx-auto w-full space-y-6 md:space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-4xl font-black leading-tight text-white">{activeTournament?.name || "Loading..."}</h1>
          <p className="text-primary/70 text-lg font-medium">Pro League | Phase: {activeStage.toUpperCase()}</p>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-primary/20 pb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? "border-secondary text-secondary bg-secondary/5" 
                  : "border-transparent text-background-light/70 hover:text-background-light hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-4">
          {activeTab === "overview" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              {/* Prize section — driven by isPaid toggle */}
              {activeTournament?.isPaid ? (
                // PAID: show prize tier breakdown
                (() => {
                  const tiers = [
                    { key: "prize1st", emoji: "🥇", label: "Winner",    color: "text-yellow-400",  border: "border-yellow-500/30", bg: "bg-yellow-500/10" },
                    { key: "prize2nd", emoji: "🥈", label: "Runner-up", color: "text-slate-300",   border: "border-slate-400/20",  bg: "bg-slate-400/10" },
                    { key: "prize3rd", emoji: "🥉", label: "3rd Place", color: "text-amber-600",   border: "border-amber-700/25",  bg: "bg-amber-700/10" },
                    { key: "prize4th", emoji: "4️⃣", label: "4th Place", color: "text-white/50",    border: "border-white/10",      bg: "bg-white/5" },
                  ].filter(t => !!(activeTournament as any)?.[t.key]);

                  return (
                    <div className="rounded-2xl border border-yellow-500/20 overflow-hidden">
                      <div className="flex items-center gap-3 px-5 py-4 bg-yellow-500/10 border-b border-yellow-500/20">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-yellow-400">Prize Pool</span>
                      </div>
                      <div className="divide-y divide-white/5 bg-background-dark/60">
                        {tiers.length > 0 ? tiers.map(({ key, emoji, label, color, border, bg }) => (
                          <div key={key} className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center text-base shrink-0`}>
                                {emoji}
                              </div>
                              <span className="text-sm font-bold text-white/70">{label}</span>
                            </div>
                            <span className={`text-xl font-black italic ${color}`}>
                              ₹{(activeTournament as any)[key]}
                            </span>
                          </div>
                        )) : (
                          // Paid but no amounts filled yet — show placeholders
                          [
                            { emoji: "🥇", label: "Winner" },
                            { emoji: "🥈", label: "Runner-up" },
                          ].map(({ emoji, label }) => (
                            <div key={label} className="flex items-center justify-between px-5 py-4 opacity-40">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">{emoji}</div>
                                <span className="text-sm font-bold text-white/50">{label}</span>
                              </div>
                              <span className="text-sm font-black italic text-white/30">TBA</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                // FREE: no entry, no prize
                <div className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base shrink-0">🆓</div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-white/60 uppercase tracking-wide">No Entry · No Prize</span>
                    <span className="text-[11px] text-white/30 font-bold">This is a free tournament</span>
                  </div>
                </div>
              )}


              {/* Rules / Instructions */}
              <div className="p-1 rounded-xl bg-gradient-to-r from-primary/50 via-primary to-primary/50 neon-glow">
                <div className="flex flex-col md:flex-row bg-background-dark p-6 rounded-lg gap-8">
                  <div className="w-full md:w-1/3 aspect-video bg-surface-dark rounded-lg flex items-center justify-center border border-primary/20">
                    <Trophy className="w-24 h-24 text-primary/30" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <Info className="text-primary w-6 h-6" />
                      <p className="text-xl font-bold">Tournament Instructions</p>
                    </div>
                    <div className="whitespace-pre-wrap text-background-light/80 text-sm p-4 bg-primary/5 rounded-lg border border-primary/10">
                      {rules || "Rules will be updated soon."}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}



          {activeTab === "bracket" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-x-auto pb-12 scrollbar-hide">
              <BracketView matches={matches} tournament={activeTournament} playerCount={players.length} groups={groups} groupedPlayers={groupedPlayers} activeTab={activeTab} />
            </section>
          )}

          {activeTab === "players" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-primary/5 border border-primary/10 rounded-xl overflow-hidden max-w-3xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm table-fixed">
                    <colgroup>
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "25%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                    </colgroup>
                    <thead className="bg-primary/5 text-background-light/70 uppercase text-xs font-bold">
                      <tr>
                        <th className="px-6 py-3">Player Name</th>
                        <th className="px-6 py-3">WhatsApp</th>
                        <th className="px-6 py-3">eFootball ID</th>
                        <th className="px-6 py-3 text-center">GF</th>
                        <th className="px-6 py-3 text-center">GA</th>
                        <th className="px-6 py-3 text-center">GD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {[...players].sort((a, b) => (b.gf || 0) - (a.gf || 0)).map((p) => (
                        <tr key={p.id} className="hover:bg-primary/5">
                          <td className="px-6 py-3 font-bold text-white truncate">{p.name}</td>
                          <td className="px-6 py-3 text-background-light/80 text-xs truncate">{p.phone || "N/A"}</td>
                          <td className="px-6 py-3 text-background-light/50 font-mono text-[10px] truncate">{p.efootballId || "—"}</td>
                          <td className="px-6 py-3 text-center font-bold text-primary">{p.gf || 0}</td>
                          <td className="px-6 py-3 text-center font-bold text-red-400">{p.ga || 0}</td>
                          <td className="px-6 py-3 text-center font-black italic text-white/40">{p.gd || 0}</td>
                        </tr>
                      ))}
                      {players.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-background-light/50">No players approved yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

           {activeTab === "standings" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeStage === "registration" || activeStage === "draw" ? (
                <div className="glass-panel p-12 rounded-xl text-center text-background-light/70 flex flex-col items-center gap-4 border border-primary/20">
                  <LayoutGrid className="w-12 h-12 text-primary/30" />
                  <p>Standings will be available once the group stage begins.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex flex-col gap-8">
                    {groups.length > 0 ? (
                      groups.map((grp: string) => (
                        <GroupTable 
                          key={grp} 
                          name={`GROUP ${grp}`} 
                          players={groupedPlayers[grp]} 
                          matches={matches} 
                          groupName={grp}
                        />
                      ))
                    ) : (
                      <div className="col-span-full">
                        <GroupTable 
                          name="Tournament Leaderboard" 
                          players={players.sort((a, b) => b.points - a.points || b.gd - a.gd)} 
                          matches={matches} 
                          groupName="None"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "fixtures" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
              {matches.length === 0 ? (
                <div className="glass-panel p-12 rounded-xl text-center text-background-light/70 flex flex-col items-center gap-4 border border-primary/20">
                  <Calendar className="w-12 h-12 text-primary/30" />
                  <p>Fixtures will be generated soon.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
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
                      if (lower.includes('round of 16') || lower.includes('r16') || lower === 'round 1' || lower === 'knockout') return 1;
                      if (lower.includes('quarter final')) return 2;
                      if (lower.includes('semi final')) return 3;
                      if (lower.includes('grand final')) return 4;
                      if (lower.startsWith('group')) return 0;
                      return 99;
                    };
                    return priority(a) - priority(b) || a.localeCompare(b);
                  }).map(([roundName, roundMatches]) => (
                    <div key={roundName} className="space-y-4">
                      <h3 className="text-xl font-black italic uppercase tracking-widest text-primary border-b border-primary/20 pb-2">
                        {roundName}
                      </h3>
                      <div className="grid gap-3">
                        {(roundMatches as any[]).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map((match, idx) => (
                            <div key={match.id} className="relative group/match">
                              {/* Background Glow */}
                              <div className="absolute inset-0 bg-primary/5 blur-xl group-hover/match:bg-primary/10 transition-all opacity-0 group-hover/match:opacity-100" />
                              
                              <div className="relative glass-panel rounded-2xl border border-white/5 group-hover/match:border-primary/20 transition-all p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 overflow-hidden">
                                {/* Match Info Badge */}
                                <div className="flex items-center gap-3 w-full md:w-32 shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center text-[10px] font-black text-white/20 group-hover/match:text-primary/40 group-hover/match:border-primary/20 transition-colors">
                                    #{match.matchIndex || idx + 1}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${match.status === 'completed' ? 'text-secondary' : 'text-primary'}`}>
                                      {match.status === 'completed' ? 'Full Time' : 'Upcoming'}
                                    </span>
                                    <span className="text-[10px] text-white/30 font-bold uppercase">{match.round}</span>
                                  </div>
                                </div>

                                {/* Match Core */}
                                <div className="flex-1 flex items-center justify-center gap-4 md:gap-12 w-full">
                                  {/* Home Player */}
                                  <div className="flex-1 flex items-center justify-end gap-4 min-w-0">
                                    <span className={`text-sm md:text-lg font-black italic uppercase tracking-tighter truncate text-right ${match.status === 'completed' && match.homeScore > match.awayScore ? 'text-white' : 'text-white/40'}`}>
                                      {match.homePlayerName}
                                    </span>
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40 shrink-0">
                                      {match.homePlayerName.charAt(0)}
                                    </div>
                                  </div>

                                  {/* Score Capsule */}
                                  <div className="shrink-0 flex flex-col items-center gap-1">
                                    <div className="px-6 py-2 bg-background-dark/80 rounded-2xl border border-white/5 flex items-center gap-4 shadow-2xl group-hover/match:border-primary/30 transition-all">
                                      <span className={`text-xl font-black italic ${match.status === 'completed' && match.homeScore > match.awayScore ? 'text-primary' : 'text-white'}`}>
                                        {match.status === 'completed' ? (match.homeScore ?? 0) : 0}
                                      </span>
                                      <span className="text-white/10 text-xs font-black italic">VS</span>
                                      <span className={`text-xl font-black italic ${match.status === 'completed' && match.awayScore > match.homeScore ? 'text-primary' : 'text-white'}`}>
                                        {match.status === 'completed' ? (match.awayScore ?? 0) : 0}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Away Player */}
                                  <div className="flex-1 flex items-center justify-start gap-4 min-w-0">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-[10px] font-black text-white/40 shrink-0">
                                      {match.awayPlayerName.charAt(0)}
                                    </div>
                                    <span className={`text-sm md:text-lg font-black italic uppercase tracking-tighter truncate text-left ${match.status === 'completed' && match.awayScore > match.homeScore ? 'text-white' : 'text-white/40'}`}>
                                      {match.awayPlayerName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function GroupTable({ name, players, matches, groupName }: { key?: string | number, name: string, players: any[], matches: any[], groupName: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayPlayers = isExpanded ? players : players.slice(0, 5);

  const getPlayerForm = (playerId: string) => {
    if (!matches) return [];
    const playerMatches = matches.filter(m => m.status === 'completed' && (m.homePlayerId === playerId || m.awayPlayerId === playerId));
    playerMatches.sort((a, b) => (b.matchIndex || 0) - (a.matchIndex || 0));
    
    return playerMatches.slice(0, 5).reverse().map(m => {
      if (m.homeScore === m.awayScore) return 'D';
      if (m.homePlayerId === playerId) {
        return m.homeScore > m.awayScore ? 'W' : 'L';
      } else {
        return m.awayScore > m.homeScore ? 'W' : 'L';
      }
    });
  };

  return (
    <div className="bg-background-dark/40 border border-white/5 rounded-[2rem] overflow-hidden backdrop-blur-sm shadow-2xl">
      <div className="bg-white/[0.02] px-8 py-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(15,164,175,0.5)]" />
          <h4 className="font-black italic uppercase tracking-widest text-white text-lg">{name}</h4>
        </div>
        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{players.length} Players</span>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-white/5">
            <tr className="text-white/40 uppercase text-[10px] font-black tracking-[0.15em]">
              <th className="px-6 py-4 w-12 text-center">#</th>
              <th className="px-6 py-4">Player</th>
              <th className="px-3 py-4 text-center">MP</th>
              <th className="px-3 py-4 text-center">W</th>
              <th className="px-3 py-4 text-center">D</th>
              <th className="px-3 py-4 text-center">L</th>
               <th className="px-3 py-4 text-center">GF</th>
              <th className="px-3 py-4 text-center">GA</th>
              <th className="px-3 py-4 text-center">GD</th>
              <th className="px-3 py-4 text-center">Pts</th>
              <th className="px-6 py-4 text-center">Form</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {displayPlayers.map((p, i) => (
              <tr key={p.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                <td className="px-6 py-5 text-center">
                  <span className="text-xs font-black text-white/30 group-hover:text-primary transition-colors">{i + 1}</span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-[10px] font-black text-white/60 uppercase shadow-inner group-hover:border-primary/40 transition-all duration-300">
                      {p.name.substring(0,2)}
                    </div>
                    <span className="font-black text-white italic tracking-tighter text-sm group-hover:text-primary transition-colors truncate max-w-[120px]">{p.name}</span>
                  </div>
                </td>
                <td className="px-3 py-5 text-center font-bold text-white/40">{p.played || 0}</td>
                <td className="px-3 py-5 text-center text-white/60">{p.wins || 0}</td>
                <td className="px-3 py-5 text-center text-white/40">{p.draws || 0}</td>
                <td className="px-3 py-5 text-center text-white/40">{p.losses || 0}</td>
                 <td className="px-3 py-5 text-center text-white/40">{p.gf || 0}</td>
                <td className="px-3 py-5 text-center text-white/40">{p.ga || 0}</td>
                <td className="px-3 py-5 text-center font-bold text-white/40">{p.gd || 0}</td>
                <td className="px-3 py-5 text-center font-black text-primary text-base tracking-tighter italic">{p.points || 0}</td>
                <td className="px-6 py-5">
                  <div className="flex items-center justify-center gap-1">
                    {getPlayerForm(p.id).map((result, idx) => (
                      <div key={idx} className="relative group/form">
                        {result === 'W' && <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />}
                        {result === 'L' && <XCircle className="w-4 h-4 text-red-500 fill-red-500/20" />}
                        {result === 'D' && <MinusCircle className="w-4 h-4 text-slate-500 fill-slate-500/20" />}
                      </div>
                    ))}
                    {getPlayerForm(p.id).length === 0 && <span className="text-white/10 text-[10px] font-black uppercase tracking-[0.2em]">-</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {players.length > 5 && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-4 bg-white/[0.02] hover:bg-white/5 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-primary transition-all group"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
          <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}
 
interface GroupNodeProps {
  key?: string | number;
  name: string;
  players: any[];
  height: number;
}

const GroupNode = ({ name, players, height }: GroupNodeProps) => (
  <div className="flex flex-col gap-2 min-w-[200px]" style={{ height }}>
    <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-2">{name} Standings</span>
    <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col justify-center divide-y divide-white/5">
      {players.slice(0, 2).map((p, i) => (
        <div key={p.id} className="py-2 flex items-center justify-between">
          <span className="text-xs font-bold text-white/60 italic truncate max-w-[120px]">{p.name || 'TBD'}</span>
          <span className="text-[10px] font-black text-primary italic">#{i+1}</span>
        </div>
      ))}
      {players.length === 0 && <span className="text-xs text-white/10 italic py-2">Waiting for matches...</span>}
    </div>
  </div>
);

interface MatchNodeProps {
  key?: string | number;
  match: any;
  title: string;
  height: number;
}

const MatchNode = ({ match, title, height }: MatchNodeProps) => {
  const isHomeWinner = match.status === 'completed' && match.homeScore > match.awayScore;
  const isAwayWinner = match.status === 'completed' && match.awayScore > match.homeScore;

  return (
    <div className="flex flex-col gap-2 min-w-[240px] group/match" style={{ height }}>
      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] group-hover/match:text-primary/70 transition-colors">
          {title}
        </span>
        {match.status === 'completed' && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="text-[9px] font-black text-secondary uppercase tracking-[0.1em] italic">FT</span>
          </div>
        )}
      </div>
      
      <div className="relative p-[1px] rounded-2xl bg-white/5 border border-white/5 group-hover/match:border-primary/20 transition-all flex-1 shadow-2xl">
        <div className="bg-background-dark/60 backdrop-blur-md rounded-2xl overflow-hidden h-full flex flex-col divide-y divide-white/[0.03]">
          <div className={`flex-1 flex items-center justify-between px-5 relative transition-all duration-500 ${isHomeWinner ? 'bg-primary/20' : ''}`}>
            {isHomeWinner && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_20px_rgba(15,164,175,1)]" />}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-black italic uppercase tracking-tighter transition-all duration-500 ${isHomeWinner ? 'text-white scale-105' : (match.homePlayerName === 'TBD' ? 'text-white/10' : 'text-white/30')}`}>
                {match.homePlayerName}
              </span>
              {isHomeWinner && <Trophy className="w-3.5 h-3.5 text-primary drop-shadow-[0_0_8px_rgba(15,164,175,0.6)] animate-bounce" />}
            </div>
            <div className={`flex flex-col items-end ${isHomeWinner ? 'scale-110' : ''} transition-transform`}>
              <span className={`text-base font-black ${isHomeWinner ? 'text-primary' : 'text-white/20'}`}>
                {match.status === 'completed' ? (match.homeScore ?? 0) : ''}
              </span>
            </div>
          </div>
          <div className={`flex-1 flex items-center justify-between px-5 relative transition-all duration-500 ${isAwayWinner ? 'bg-primary/20' : ''}`}>
            {isAwayWinner && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_20px_rgba(15,164,175,1)]" />}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-black italic uppercase tracking-tighter transition-all duration-500 ${isAwayWinner ? 'text-white scale-105' : (match.awayPlayerName === 'TBD' ? 'text-white/10' : 'text-white/30')}`}>
                {match.awayPlayerName}
              </span>
              {isAwayWinner && <Trophy className="w-3.5 h-3.5 text-primary drop-shadow-[0_0_8px_rgba(15,164,175,0.6)] animate-bounce" />}
            </div>
            <div className={`flex flex-col items-end ${isAwayWinner ? 'scale-110' : ''} transition-transform`}>
              <span className={`text-base font-black ${isAwayWinner ? 'text-primary' : 'text-white/20'}`}>
                {match.status === 'completed' ? (match.awayScore ?? 0) : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BracketView = ({ matches, tournament, playerCount, groups, groupedPlayers, activeTab }: { matches: any[], tournament: any, playerCount: number, groups: string[], groupedPlayers: Record<string, any[]>, activeTab: string }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const isHybrid = tournament?.format?.toLowerCase() === 'hybrid';
  const isKnockoutStarted = tournament?.activeStage === 'knockout' || tournament?.activeStage === 'finished';

  // 1. Determine Starting Round (Strictly Knockout)
  const targetQuals = tournament?.target_qualifiers || (playerCount > 8 ? 16 : 8);
  const knockoutStartingRound = targetQuals <= 4 ? 'SF' : targetQuals <= 8 ? 'QF' : 'R16';
  const startRound = (isHybrid && groups.length > 0) ? knockoutStartingRound : knockoutStartingRound;

  const r16MatchesRaw = matches.filter(m => 
    m.round === "Round 1" || 
    m.round === "Round of 16" || 
    m.round?.toLowerCase().includes("round of 16") ||
    m.round?.toLowerCase().includes("r16") ||
    m.round?.toLowerCase() === "knockout" // Match potential fallback names
  ).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  const qfMatchesRaw = matches.filter(m => m.round === "Quarter Final" || m.round?.toLowerCase().includes("quarter final") || m.round?.toLowerCase().includes("qf")).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  const sfMatchesRaw = matches.filter(m => m.round === "Semi Final" || m.round?.toLowerCase().includes("semi final") || m.round?.toLowerCase().includes("sf")).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  const finalMatchRaw = matches.find(m => m.round === "Grand Final" || m.round?.toLowerCase().includes("grand final"));

  const getWinnerFromMatches = (roundMatches: any[], relativeIdx: number) => {
    const match = roundMatches[relativeIdx];
    if (!match || match.status !== 'completed') return null;
    return match.homeScore > match.awayScore ? match.homePlayerName : match.awayPlayerName;
  };

  // 3. Round Definitions
  const rounds = [];
  if (startRound === 'R16') {
    const m = Array.from({ length: 8 }, (_, i) => r16MatchesRaw[i] || { id: `p-r16-${i}`, round: 'Round of 16', homePlayerName: 'TBD', awayPlayerName: 'TBD', status: 'pending', matchIndex: i + 1 });
    rounds.push({ id: 'R16', matches: m, title: 'Round of 16' });
  }
  if (startRound === 'R16' || startRound === 'QF') {
    const m = Array.from({ length: 4 }, (_, i) => qfMatchesRaw[i] || { id: `p-qf-${i}`, round: 'Quarter Final', homePlayerName: 'TBD', awayPlayerName: 'TBD', status: 'pending', matchIndex: i + 1 });
    rounds.push({ id: 'QF', matches: m, title: 'Quarter Finals' });
  }
  const sfMatches = Array.from({ length: 2 }, (_, i) => sfMatchesRaw[i] || { id: `p-sf-${i}`, round: 'Semi Final', homePlayerName: 'TBD', awayPlayerName: 'TBD', status: 'pending', matchIndex: i + 1 });
  rounds.push({ id: 'SF', matches: sfMatches, title: 'Semi Finals' });

  const homeWinnerFromSF = getWinnerFromMatches(sfMatches, 0) || 'TBD';
  const awayWinnerFromSF = getWinnerFromMatches(sfMatches, 1) || 'TBD';
  
  const finalMatch = finalMatchRaw ? {
    ...finalMatchRaw,
    homePlayerName: (finalMatchRaw.homePlayerName === 'TBD' || !finalMatchRaw.homePlayerName) ? homeWinnerFromSF : finalMatchRaw.homePlayerName,
    awayPlayerName: (finalMatchRaw.awayPlayerName === 'TBD' || !finalMatchRaw.awayPlayerName) ? awayWinnerFromSF : finalMatchRaw.awayPlayerName,
  } : { 
    id: 'p-final', 
    round: 'Grand Final', 
    homePlayerName: homeWinnerFromSF, 
    awayPlayerName: awayWinnerFromSF, 
    status: 'pending', 
    matchIndex: 1 
  };

  const winnerInfo = (() => {
    if (!finalMatch || finalMatch.status !== 'completed') return null;
    const isHomeWinner = finalMatch.homeScore > finalMatch.awayScore;
    const winnerId = isHomeWinner ? finalMatch.homePlayerId : finalMatch.awayPlayerId;
    const winnerName = isHomeWinner ? finalMatch.homePlayerName : finalMatch.awayPlayerName;
    
    const tournamentGoals = matches.reduce((sum, m) => {
      let goals = 0;
      if (m.homePlayerId === winnerId) goals += (m.homeScore || 0);
      if (m.awayPlayerId === winnerId) goals += (m.awayScore || 0);
      return sum + goals;
    }, 0);
    
    return { name: winnerName, goals: tournamentGoals };
  })();

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  useEffect(() => {
    if (finalMatch.status === 'completed' && activeTab === 'bracket') {
      triggerConfetti();
    }
  }, [finalMatch.status, activeTab]);

  // 4. Layout Calculations
  const CARD_HEIGHT = 130;
  const GAP_BASE = 32;
  const COLUMN_WIDTH = 56;
  const cx = COLUMN_WIDTH / 2;
  const LINE_COLOR = 'rgba(15, 164, 175, 0.2)';

  const roundYs: Record<string, number[]> = {};
  rounds.forEach((round, idx) => {
    if (idx === 0) {
      roundYs[round.id] = Array.from({ length: round.matches.length }, (_, i) => (CARD_HEIGHT / 2) + i * (CARD_HEIGHT + GAP_BASE));
    } else {
      const prevYs = roundYs[rounds[idx-1].id];
      roundYs[round.id] = Array.from({ length: round.matches.length }, (_, i) => (prevYs[i*2] + prevYs[i*2 + 1]) / 2);
    }
  });

  const lastRoundYs = roundYs[rounds[rounds.length-1].id];
  const finalY = (lastRoundYs.length === 2) ? (lastRoundYs[0] + lastRoundYs[1]) / 2 : lastRoundYs[0];
  const totalHeight = (rounds[0].matches.length) * (CARD_HEIGHT + GAP_BASE);

  return (
    <div className="space-y-24">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        
        @media (max-width: 768px) {
          .custom-scrollbar {
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch;
          }
          .custom-scrollbar::-webkit-scrollbar {
            height: 6px;
            display: block !important;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(15, 164, 175, 0.3);
            border-radius: 10px;
          }
        }
      `}</style>
      {/* Qualifiers Summary Section */}
      {isHybrid && groups.length > 0 && (
        <div className="flex flex-wrap gap-4 px-4 md:px-0">
          {groups.map((g) => {
            const qualsPerGroup = tournament?.qualifiers_per_group || (tournament?.target_qualifiers ? Math.max(1, Math.ceil(tournament.target_qualifiers / (groups.length || 1))) : 2);
            const topPlayers = (groupedPlayers[g] || []).slice(0, qualsPerGroup);
            return (
              <div key={g} className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[180px] flex-1 backdrop-blur-sm">
                <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-3">Group {g} Top Players</p>
                <div className="space-y-2">
                  {topPlayers.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-[10px] font-black text-primary/40 italic">#{i+1}</span>
                        <span className="text-xs font-bold text-white/80 truncate">{p.name}</span>
                      </div>
                      <Shield className="w-3 h-3 text-primary/20" />
                    </div>
                  ))}
                  {topPlayers.length === 0 && <span className="text-[10px] text-white/20 italic">No rankings yet</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bracket Section */}
      <div className="flex items-start p-2 min-w-max">
        {rounds.map((round, rIdx) => {
          const currentYs = roundYs[round.id];
          const nextRound = rounds[rIdx + 1];

          return (
            <Fragment key={round.id}>
              <div className="flex flex-col shrink-0" style={{ gap: GAP_BASE }}>
                {round.matches.map((m: any, mIdx: number) => {
                  const y = currentYs[mIdx];
                  const topOffset = mIdx === 0 ? y - (CARD_HEIGHT / 2) : (y - currentYs[mIdx-1]) - CARD_HEIGHT - GAP_BASE;
                  return (
                    <div key={m.id} style={{ marginTop: topOffset }}>
                      <MatchNode match={m} title={`${round.title} — #${m.matchIndex || mIdx + 1}`} height={CARD_HEIGHT} />
                    </div>
                  );
                })}
              </div>
              
              {nextRound ? (
                <svg width={COLUMN_WIDTH} height={totalHeight} className="shrink-0">
                  {currentYs.map((y, i) => i % 2 === 0 && (
                    <path 
                      key={i} 
                      stroke={LINE_COLOR} 
                      strokeWidth="2" 
                      fill="none" 
                      d={`M 0 ${y} H ${cx} V ${currentYs[i+1]} M 0 ${currentYs[i+1]} H ${cx} M ${cx} ${roundYs[nextRound.id][i/2]} H ${COLUMN_WIDTH}`} 
                    />
                  ))}
                </svg>
              ) : (
                <svg width={COLUMN_WIDTH} height={totalHeight} className="shrink-0">
                  {currentYs.length === 2 ? (
                    <path stroke={LINE_COLOR} strokeWidth="2" fill="none" d={`M 0 ${currentYs[0]} H ${cx} V ${currentYs[1]} M 0 ${currentYs[1]} H ${cx} M ${cx} ${finalY} H ${COLUMN_WIDTH}`} />
                  ) : (
                    <path stroke={LINE_COLOR} strokeWidth="2" fill="none" d={`M 0 ${currentYs[0]} H ${COLUMN_WIDTH}`} />
                  )}
                </svg>
              )}
            </Fragment>
          );
        })}

        <div className="flex items-center" style={{ height: totalHeight }}>
          <div 
            className="group perspective-1000 w-[280px] h-[380px] relative cursor-pointer"
            onMouseEnter={() => {
              if (finalMatch.status === 'completed') triggerConfetti();
            }}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : 'md:group-hover:rotate-y-180'}`}>
              {/* Front Face */}
              <div className="absolute inset-0 backface-hidden">
                <div className="relative p-[2px] rounded-[2.5rem] bg-gradient-to-b from-primary via-primary/20 to-transparent shadow-[0_20px_60px_rgba(15,164,175,0.3)] w-full h-full">
                  <div className="bg-background-dark/90 backdrop-blur-2xl rounded-[2.4rem] p-4 flex flex-col items-center gap-3 text-center border border-white/5 h-full">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/30 shadow-inner">
                        <Trophy className="w-8 h-8 text-primary shadow-glow" />
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter text-white leading-tight">Grand Final</h3>
                      <p className="text-[9px] text-white/30 uppercase font-black tracking-[0.3em]">The Ultimate Showdown</p>
                    </div>
                    <div className="flex flex-col gap-3 w-full">
                       <div className={`p-3 rounded-2xl transition-all ${finalMatch.status === 'completed' && finalMatch.homeScore > finalMatch.awayScore ? 'bg-primary/10 border border-primary/20 ring-1 ring-primary/20 scale-105' : 'bg-white/[0.02] border border-white/5 opacity-50'}`}>
                         <span className={`text-base font-black italic uppercase tracking-tighter block truncate ${finalMatch.status === 'completed' && finalMatch.homeScore > finalMatch.awayScore ? 'text-white' : 'text-white/40'}`}>
                           {finalMatch.homePlayerName}
                         </span>
                       </div>
                       <div className="flex items-center gap-3 px-3 overflow-hidden">
                         <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/30" />
                         <span className="text-primary font-black italic text-lg tracking-widest drop-shadow-[0_0_8px_rgba(15,164,175,0.4)]">VS</span>
                         <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/30" />
                       </div>
                       <div className={`p-3 rounded-2xl transition-all ${finalMatch.status === 'completed' && finalMatch.awayScore > finalMatch.homeScore ? 'bg-primary/10 border border-primary/20 ring-1 ring-primary/20 scale-105' : 'bg-white/[0.02] border border-white/5 opacity-50'}`}>
                         <span className={`text-base font-black italic uppercase tracking-tighter block truncate ${finalMatch.status === 'completed' && finalMatch.awayScore > finalMatch.homeScore ? 'text-white' : 'text-white/40'}`}>
                           {finalMatch.awayPlayerName}
                         </span>
                       </div>
                    </div>
                    {finalMatch.status === 'completed' && (
                      <div className="w-full px-5 py-3 bg-primary text-background-dark rounded-xl font-black text-lg italic tracking-tighter shadow-[0_8px_25px_rgba(15,164,175,0.4)] text-center mt-auto">
                        {finalMatch.homeScore} - {finalMatch.awayScore}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Back Face */}
              <div className="absolute inset-0 backface-hidden rotate-y-180">
                <div className="relative p-[2px] rounded-[2.5rem] bg-gradient-to-t from-primary via-primary/20 to-transparent shadow-[0_20px_60px_rgba(15,164,175,0.3)] w-full h-full">
                  <div className="bg-background-dark/90 backdrop-blur-2xl rounded-[2.4rem] p-5 flex flex-col items-center justify-center gap-4 text-center border border-white/5 h-full overflow-hidden">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
                      <Trophy className="w-12 h-12 text-primary shadow-glow relative" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">CHAMPION</h3>
                      <p className="text-lg font-black text-primary uppercase italic tracking-widest truncate max-w-[220px]">
                        {winnerInfo ? winnerInfo.name : "TBD"}
                      </p>
                    </div>
                    <div className="w-full p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/40">Total Tournament Goals</p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-4xl font-black text-primary italic drop-shadow-[0_0_15px_rgba(15,164,175,0.5)]">
                          {winnerInfo ? winnerInfo.goals : "0"}
                        </span>
                        <div className="h-6 w-0.5 bg-white/10 rounded-full" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest italic">Goals</span>
                      </div>
                    </div>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Touch or hover to see match result</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


