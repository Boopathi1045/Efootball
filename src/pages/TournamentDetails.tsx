import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Trophy, Info, Users, Shield, Calendar, ChevronLeft, LayoutGrid, List, CheckCircle2, XCircle, MinusCircle, ChevronDown } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export default function TournamentDetails() {
  const { id } = useParams();
  const [rules, setRules] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState("registration");
  const [activeTab, setActiveTab] = useState("overview");

  const [activeTournament, setActiveTournament] = useState<any>(null);

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
        .select('*')
        .eq('status', 'approved')
        .eq('tournamentId', activeTournament.id);
      if (pData) setPlayers(pData);

      const { data: mData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournamentId', activeTournament.id);
      if (mData) setMatches(mData);
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

  const groups = Array.from(new Set(players.filter(p => p.group && p.group !== "None").map(p => p.group as string))).sort();
  const groupedPlayers = groups.reduce((acc: Record<string, any[]>, group: string) => {
    acc[group] = players.filter(p => p.group === group).sort((a, b) => b.points - a.points || b.gd - a.gd);
    return acc;
  }, {});

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "bracket", label: "Bracket", icon: Trophy },
    { id: "fixtures", label: "Fixtures", icon: Calendar },
    { id: "standings", label: "Standings", icon: LayoutGrid },
    { id: "players", label: "Players", icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-primary/20 px-4 md:px-20 py-4 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-primary/10 rounded-full transition-colors text-background-light/70 hover:text-white">
            <ChevronLeft className="w-6 h-6" />
          </Link>
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
              <BracketView matches={matches} tournament={activeTournament} playerCount={players.length} />
            </section>
          )}

          {activeTab === "players" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-primary/5 border border-primary/10 rounded-xl overflow-hidden max-w-3xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm table-fixed">
                    <colgroup>
                      <col style={{ width: "40%" }} />
                      <col style={{ width: "35%" }} />
                      <col style={{ width: "25%" }} />
                    </colgroup>
                    <thead className="bg-primary/5 text-background-light/70 uppercase text-xs font-bold">
                      <tr>
                        <th className="px-6 py-3">Player Name</th>
                        <th className="px-6 py-3">WhatsApp Number</th>
                        <th className="px-6 py-3">eFootball ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {players.map((p) => (
                        <tr key={p.id} className="hover:bg-primary/5">
                          <td className="px-6 py-3 font-bold text-white truncate">{p.name}</td>
                          <td className="px-6 py-3 text-background-light/80 text-sm truncate">{p.phone || "N/A"}</td>
                          <td className="px-6 py-3 text-background-light/50 font-mono text-xs truncate">{p.efootballId || "—"}</td>
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
                  <div 
                    className="grid gap-8"
                    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}
                  >
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
                  ).sort(([a], [b]) => a.localeCompare(b)).map(([roundName, roundMatches]) => (
                    <div key={roundName} className="space-y-4">
                      <h3 className="text-xl font-black italic uppercase tracking-widest text-primary border-b border-primary/20 pb-2">
                        {roundName}
                      </h3>
                      <div className="grid gap-3">
                        {(roundMatches as any[]).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map(match => (
                          <div key={match.id} className="glass-panel p-4 rounded-xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-primary/40 transition-colors">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary/70 uppercase w-full md:w-32">
                              {match.status === 'completed' ? (
                                <span className="px-2 py-1 bg-secondary border border-secondary text-white rounded">FT</span>
                              ) : (
                                <span className="px-2 py-1 bg-primary/10 border border-primary/30 rounded text-primary">TBD</span>
                              )}
                            </div>
                            
                            <div className="flex-1 flex items-center justify-center gap-4 w-full">
                              <div className="flex-1 text-right font-bold text-white truncate">{match.homePlayerName}</div>
                              <div className="px-4 py-2 bg-background-dark rounded-lg border border-primary/10 font-mono font-bold flex items-center gap-2 min-w-[80px] justify-center">
                                <span className={match.status === 'completed' && match.homeScore > match.awayScore ? "text-secondary text-lg" : "text-background-light text-md"}>
                                  {match.status === 'completed' ? (match.homeScore ?? 0) : 0}
                                </span>
                                <span className="text-background-light/30 text-xs mt-1">VS</span>
                                <span className={match.status === 'completed' && match.awayScore > match.homeScore ? "text-secondary text-lg" : "text-background-light text-md"}>
                                  {match.status === 'completed' ? (match.awayScore ?? 0) : 0}
                                </span>
                              </div>
                              <div className="flex-1 text-left font-bold text-white truncate">{match.awayPlayerName}</div>
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

function BracketView({ matches, tournament, playerCount }: { matches: any[], tournament: any, playerCount: number }) {
  // 1. Dynamic Detection of Rounds
  const targetQuals = tournament?.target_qualifiers || (playerCount > 8 ? 16 : 8);
  
  const r16MatchesRaw = matches.filter(m => m.round === "Round 1" || m.round === "Round of 16" || m.round?.toLowerCase().includes("round of 16")).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  const hasR16Matches = r16MatchesRaw.length > 0;
  const showR16 = targetQuals === 16 || hasR16Matches;

  const rawQfMatches = matches.filter(m => m.round === "Quarter Final" || m.round?.toLowerCase().includes("quarter final")).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  const rawSfMatches = matches.filter(m => m.round === "Semi Final" || m.round?.toLowerCase().includes("semi final")).sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  const rawFinalMatch = matches.find(m => m.round === "Grand Final" || m.round?.toLowerCase().includes("grand final"));

  // 1.5 Helper to get Winner Name for a slot if the match is completed
  const getWinnerFromMatches = (roundMatches: any[], relativeIdx: number) => {
    // Use array index (0-based) to find the match in that round
    const match = roundMatches[relativeIdx];
    if (!match || match.status !== 'completed') return null;
    return match.homeScore > match.awayScore ? match.homePlayerName : match.awayPlayerName;
  };

  // 2. Map QF Slots (potentially showing winners from R16)
  const qfMatches = Array.from({ length: 4 }, (_, i) => {
    // Check if we HAVE an actual match for this QF slot in the DB
    const existing = rawQfMatches[i];
    if (existing) return existing;
    
    // Fallback: Live advancement from R16 mapping
    let home = 'TBD';
    let away = 'TBD';
    if (showR16) {
      home = getWinnerFromMatches(r16MatchesRaw, i * 2) || 'TBD';
      away = getWinnerFromMatches(r16MatchesRaw, i * 2 + 1) || 'TBD';
    }
    return { id: `p-qf-${i}`, round: 'Quarter Final', homePlayerName: home, awayPlayerName: away, status: 'pending', matchIndex: i + 1 };
  });

  // 3. Map SF Slots (potentially showing winners from QF)
  const sfMatches = Array.from({ length: 2 }, (_, i) => {
    // Check if we HAVE an actual match for this SF slot in the DB
    const existing = rawSfMatches[i];
    if (existing) return existing;
    
    // Fallback: Live advancement from QF: SF1=QF1vsQF2, SF2=QF3vsQF4
    const home = getWinnerFromMatches(rawQfMatches.length > 0 ? rawQfMatches : qfMatches, i * 2) || 'TBD';
    const away = getWinnerFromMatches(rawQfMatches.length > 0 ? rawQfMatches : qfMatches, i * 2 + 1) || 'TBD';
    return { id: `p-sf-${i}`, round: 'Semi Final', homePlayerName: home, awayPlayerName: away, status: 'pending', matchIndex: i + 1 };
  });

  // 4. Map Grand Final
  const finalMatch = rawFinalMatch || (() => {
    const home = getWinnerFromMatches(rawSfMatches.length > 0 ? rawSfMatches : sfMatches, 0) || 'TBD';
    const away = getWinnerFromMatches(rawSfMatches.length > 0 ? rawSfMatches : sfMatches, 1) || 'TBD';
    return { id: 'p-final', round: 'Grand Final', homePlayerName: home, awayPlayerName: away, status: 'pending', matchIndex: 1 };
  })();

  // ─── Layout constants ─────────
  const CH = 130;   // card height
  const QG = 32;    // gap
  const CW = 56;    // svg width
  const cx = CW / 2;
  const LINE = 'rgba(15, 164, 175, 0.2)';

  // Y Positions
  const r16Ys = Array.from({ length: 8 }, (_, i) => CH / 2 + i * (CH + QG));
  const qfYs = showR16 
    ? Array.from({ length: 4 }, (_, i) => (r16Ys[i*2] + r16Ys[i*2 + 1]) / 2)
    : Array.from({ length: 4 }, (_, i) => CH / 2 + i * (CH + QG));
  
  const sfYs = [(qfYs[0] + qfYs[1]) / 2, (qfYs[2] + qfYs[3]) / 2];
  const finalY = (sfYs[0] + sfYs[1]) / 2;
  const totalH = showR16 ? 8 * CH + 7 * QG : 4 * CH + 3 * QG;

  const MatchNode = ({ match, title }: { match: any, title: string }) => {
    const isHomeWinner = match.status === 'completed' && match.homeScore > match.awayScore;
    const isAwayWinner = match.status === 'completed' && match.awayScore > match.homeScore;

    return (
      <div className="flex flex-col gap-2 min-w-[240px] group/match" style={{ height: CH }}>
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
            {/* Home Player Row */}
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

            {/* Away Player Row */}
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

  return (
    <div className="flex items-start p-8 min-w-max">
      {/* ── Round of 16 ── */}
      {showR16 && (
        <>
          <div className="flex flex-col shrink-0" style={{ gap: QG }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const m = r16MatchesRaw[i] || { id: `p-r16-${i}`, round: 'Round 1', homePlayerName: 'TBD', awayPlayerName: 'TBD', status: 'pending' };
              return <div key={m.id}><MatchNode match={m} title={`Round of 16 — #${i + 1}`} /></div>
            })}
          </div>
          <svg width={CW} height={totalH} className="shrink-0">
            {r16Ys.map((y, i) => i % 2 === 0 && (
              <path key={i} stroke={LINE} strokeWidth="2" fill="none" d={`M 0 ${y} H ${cx} V ${r16Ys[i+1]} M 0 ${r16Ys[i+1]} H ${cx} M ${cx} ${qfYs[i/2]} H ${CW}`} />
            ))}
          </svg>
        </>
      )}

      {/* ── Quarter Finals ── */}
      <div className="flex flex-col shrink-0" style={{ marginTop: showR16 ? qfYs[0] - CH/2 : 0, gap: showR16 ? qfYs[1] - qfYs[0] - CH : QG }}>
        {qfMatches.map((m, i) => (
          <div key={m.id}><MatchNode match={m} title={`Quarter-Final ${i + 1}`} /></div>
        ))}
      </div>

      {/* ── QF → SF connector ── */}
      <svg width={CW} height={totalH} className="shrink-0">
        {qfYs.map((y, i) => i % 2 === 0 && (
          <path key={i} stroke={LINE} strokeWidth="2" fill="none" d={`M 0 ${y} H ${cx} V ${qfYs[i+1]} M 0 ${qfYs[i+1]} H ${cx} M ${cx} ${sfYs[i/2]} H ${CW}`} />
        ))}
      </svg>

      {/* ── Semi Finals ── */}
      <div className="flex flex-col shrink-0" style={{ marginTop: sfYs[0] - CH/2, gap: sfYs[1] - sfYs[0] - CH }}>
        {sfMatches.map((m, i) => (
          <div key={m.id}><MatchNode match={m} title={`Semi-Final ${i + 1}`} /></div>
        ))}
      </div>

      {/* ── SF → Final connector ── */}
      <svg width={CW} height={totalH} className="shrink-0">
        <path stroke={LINE} strokeWidth="2" fill="none" d={`M 0 ${sfYs[0]} H ${cx} V ${sfYs[1]} M 0 ${sfYs[1]} H ${cx} M ${cx} ${finalY} H ${CW}`} />
      </svg>

      {/* ── Grand Final ── */}
      <div className="flex items-center" style={{ height: totalH }}>
        <div className="relative p-[2px] rounded-[2.5rem] bg-gradient-to-b from-primary via-primary/20 to-transparent shadow-[0_20px_60px_rgba(15,164,175,0.3)] w-[320px]">
          <div className="bg-background-dark/90 backdrop-blur-2xl rounded-[2.4rem] p-8 flex flex-col items-center gap-6 text-center border border-white/5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/30 shadow-inner">
                <Trophy className="w-10 h-10 text-primary shadow-glow" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Grand Final</h3>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-[0.4em]">The Ultimate Showdown</p>
            </div>

            <div className="flex flex-col gap-4 w-full">
               <div className={`p-4 rounded-2xl transition-all ${finalMatch.status === 'completed' && finalMatch.homeScore > finalMatch.awayScore ? 'bg-primary/10 border border-primary/20 ring-1 ring-primary/20 scale-105' : 'bg-white/[0.02] border border-white/5 opacity-50'}`}>
                 <span className={`text-lg font-black italic uppercase tracking-tighter block truncate ${finalMatch.status === 'completed' && finalMatch.homeScore > finalMatch.awayScore ? 'text-white' : 'text-white/40'}`}>
                   {finalMatch.homePlayerName}
                 </span>
               </div>
               
               <div className="flex items-center gap-4 px-4 overflow-hidden">
                 <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-primary/40" />
                 <span className="text-primary font-black italic text-xl tracking-widest drop-shadow-[0_0_8px_rgba(15,164,175,0.5)]">VS</span>
                 <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-primary/40" />
               </div>

               <div className={`p-4 rounded-2xl transition-all ${finalMatch.status === 'completed' && finalMatch.awayScore > finalMatch.homeScore ? 'bg-primary/10 border border-primary/20 ring-1 ring-primary/20 scale-105' : 'bg-white/[0.02] border border-white/5 opacity-50'}`}>
                 <span className={`text-lg font-black italic uppercase tracking-tighter block truncate ${finalMatch.status === 'completed' && finalMatch.awayScore > finalMatch.homeScore ? 'text-white' : 'text-white/40'}`}>
                   {finalMatch.awayPlayerName}
                 </span>
               </div>
            </div>

            {finalMatch.status === 'completed' && (
              <div className="w-full px-6 py-4 bg-primary text-background-dark rounded-2xl font-black text-xl italic tracking-tighter shadow-[0_10px_30px_rgba(15,164,175,0.5)]">
                {finalMatch.homeScore} - {finalMatch.awayScore}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
