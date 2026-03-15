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
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
              <BracketView matches={matches} />
            </section>
          )}

          {activeTab === "players" && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-primary/5 border border-primary/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-primary/5 text-background-light/70 uppercase text-xs font-bold">
                      <tr>
                        <th className="px-6 py-4">Player Name</th>
                        <th className="px-6 py-4">WhatsApp Number</th>
                        <th className="px-6 py-4 text-right">eFootball ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {players.map((p) => (
                        <tr key={p.id} className="hover:bg-primary/5">
                          <td className="px-6 py-4 font-bold text-white">{p.name}</td>
                          <td className="px-6 py-4 text-background-light/80 text-sm">{p.phone || "N/A"}</td>
                          <td className="px-6 py-4 text-right text-background-light/50 font-mono text-xs">{p.efootballId}</td>
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

function BracketView({ matches }: { matches: any[] }) {
  const qfMatches = matches.filter(m => m.round === "Quarter Final").sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  
  // Always ensure at least 2 slots for Semi Finals if none exist, to show the structure
  const rawSfMatches = matches.filter(m => m.round === "Semi Final").sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0));
  const sfMatches = rawSfMatches.length > 0 ? rawSfMatches : [
    { id: 'p-sf-1', round: 'Semi Final', homePlayerName: 'TBD', awayPlayerName: 'TBD', status: 'pending' },
    { id: 'p-sf-2', round: 'Semi Final', homePlayerName: 'TBD', awayPlayerName: 'TBD', status: 'pending' }
  ];

  const finalMatch = matches.find(m => m.round === "Grand Final");

  const MatchNode = ({ match, title }: { match: any, title: string }) => (
    <div className="flex flex-col gap-3 min-w-[260px] group/match">
      <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-0.5 italic px-2 group-hover/match:text-white transition-colors">
        {title}
      </span>
      <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-primary/40 via-primary/5 to-transparent transition-all duration-500 group-hover/match:from-primary/60">
        <div className="bg-background-dark/80 backdrop-blur-xl rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/5">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 hover:bg-white/[0.03] transition-all gap-4">
            <span className={`text-sm font-bold italic uppercase tracking-tighter truncate ${match.status === 'completed' && match.homeScore > match.awayScore ? 'text-white scale-105 origin-left' : 'text-white/40'} transition-all`}>
              {match.homePlayerName}
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${match.status === 'completed' && match.homeScore > match.awayScore ? 'bg-primary text-background-dark shadow-[0_0_20px_rgba(15,164,175,0.4)]' : 'bg-white/5 text-white/20'}`}>
              {match.status === 'completed' ? (match.homeScore ?? 0) : 0}
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-all gap-4">
            <span className={`text-sm font-bold italic uppercase tracking-tighter truncate ${match.status === 'completed' && match.awayScore > match.homeScore ? 'text-white scale-105 origin-left' : 'text-white/40'} transition-all`}>
              {match.awayPlayerName}
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${match.status === 'completed' && match.awayScore > match.homeScore ? 'bg-primary text-background-dark shadow-[0_0_20px_rgba(15,164,175,0.4)]' : 'bg-white/5 text-white/20'}`}>
              {match.status === 'completed' ? (match.awayScore ?? 0) : 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex gap-16 py-8 items-center min-w-[max-content]">
      {/* Quarter Finals */}
      {qfMatches.length > 0 && (
        <div className="flex flex-col gap-12">
          {qfMatches.map((m, i) => (
            <div key={m.id} className="relative">
              <MatchNode match={m} title={`Quarter-Final ${i + 1}`} />
              <div className="absolute top-1/2 -right-16 w-16 h-px bg-white/10" />
              {i % 2 === 0 ? (
                <div className="absolute top-1/2 -right-16 h-[88px] w-px bg-white/10" />
              ) : (
                <div className="absolute bottom-1/2 -right-16 h-[88px] w-px bg-white/10" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Semi Finals */}
      <div className="flex flex-col gap-40">
        {sfMatches.map((m, i) => (
          <div key={m.id} className="relative">
            <MatchNode match={m} title={`Semi-Final ${i + 1}`} />
            <div className="absolute top-1/2 -right-16 w-16 h-px bg-white/10" />
            {i % 2 === 0 ? (
              <div className="absolute top-1/2 -right-16 h-[140px] w-px bg-white/10" />
            ) : (
              <div className="absolute bottom-1/2 -right-16 h-[140px] w-px bg-white/10" />
            )}
          </div>
        ))}
      </div>

      {/* Grand Final Card */}
      <div className="ml-8">
        <div className="relative p-[1px] rounded-[2.5rem] bg-gradient-to-b from-primary via-primary/20 to-transparent shadow-[0_20px_50px_rgba(15,164,175,0.2)] w-full max-w-[360px] mx-auto">
          <div className="bg-background-dark/90 backdrop-blur-2xl rounded-[2.4rem] p-8 md:p-12 flex flex-col items-center gap-6 md:gap-8 text-center border border-white/5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(15,164,175,0.2)]">
                <Trophy className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Grand Final</h3>
              <p className="text-[11px] text-white/30 uppercase font-black tracking-[0.4em]">The Ultimate Showdown</p>
            </div>
            
            <div className="flex flex-col gap-6 w-full py-4 relative">
              <div className="flex flex-col gap-1">
                <div className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white truncate px-4">
                  {finalMatch ? finalMatch.homePlayerName : "TBD"}
                </div>
                <div className="flex items-center justify-center gap-4 py-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/30" />
                  <span className="text-primary font-black italic text-xl tracking-widest px-2">VS</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/30" />
                </div>
                <div className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white truncate px-4">
                  {finalMatch ? finalMatch.awayPlayerName : "TBD"}
                </div>
              </div>
              
              <div className="mt-4 px-6 py-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md">
                <span className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">
                  {finalMatch?.status === 'completed' ? (
                    <span className="flex items-center justify-center gap-3">
                      Result: <span className="text-primary text-lg">{finalMatch.homeScore} - {finalMatch.awayScore}</span>
                    </span>
                  ) : "Match Pending"}
                </span>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}
