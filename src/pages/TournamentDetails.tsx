import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Trophy, Info, Users, Shield, Calendar, ChevronLeft, LayoutGrid, List } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export default function TournamentDetails() {
  const { id } = useParams();
  const [rules, setRules] = useState("");
  const [players, setPlayers] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeStage, setActiveStage] = useState("registration");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) {
        setRules(doc.data().rules || "");
        setActiveStage(doc.data().activeStage || "registration");
      }
    });

    const unsubPlayers = onSnapshot(query(collection(db, "players"), where("status", "==", "approved")), (snapshot) => {
      setPlayers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMatches = onSnapshot(collection(db, "matches"), (snapshot) => {
      setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubSettings();
      unsubPlayers();
      unsubMatches();
    };
  }, []);

  const groupA = players.filter(p => p.group === "A").sort((a, b) => b.points - a.points || b.gd - a.gd);
  const groupB = players.filter(p => p.group === "B").sort((a, b) => b.points - a.points || b.gd - a.gd);

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "players", label: "Players", icon: Users },
    { id: "standings", label: "Standings", icon: LayoutGrid },
    { id: "fixtures", label: "Fixtures", icon: Calendar },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between border-b border-primary/20 px-6 md:px-20 py-4 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-primary/10 rounded-full transition-colors text-background-light/70 hover:text-white">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <Trophy className="text-primary w-8 h-8" />
          <h2 className="text-xl font-bold hidden sm:block">Tournament Details</h2>
        </div>
        <div className="flex gap-4">
          <Link to="/register" className="px-4 py-2 bg-secondary text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-[0_0_10px_rgba(150,71,52,0.4)]">
            Register Now
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 md:px-20 py-8 max-w-[1400px] mx-auto w-full space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black leading-tight text-white">Elite Championship 2024</h1>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <GroupTable name="GROUP A" players={groupA} />
                  <GroupTable name="GROUP B" players={groupB} />
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
                <div className="grid gap-4">
                  {matches.sort((a, b) => (a.matchIndex || 0) - (b.matchIndex || 0)).map(match => (
                    <div key={match.id} className="glass-panel p-4 rounded-xl border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-primary/70 uppercase w-full md:w-32">
                        <span className="px-2 py-1 bg-primary/10 rounded">{match.stage}</span>
                        {match.group && match.group !== 'None' && <span>Grp {match.group}</span>}
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center gap-4 w-full">
                        <div className="flex-1 text-right font-bold text-white truncate">{match.homePlayerName}</div>
                        <div className="px-4 py-2 bg-background-dark rounded-lg border border-primary/10 font-mono font-bold text-lg flex items-center gap-2 min-w-[80px] justify-center">
                          <span className={match.homeScore > match.awayScore ? "text-secondary" : "text-background-light"}>{match.homeScore}</span>
                          <span className="text-background-light/50">-</span>
                          <span className={match.awayScore > match.homeScore ? "text-secondary" : "text-background-light"}>{match.awayScore}</span>
                        </div>
                        <div className="flex-1 text-left font-bold text-white truncate">{match.awayPlayerName}</div>
                      </div>

                      <div className="w-full md:w-24 text-right">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                          match.status === 'completed' ? 'bg-secondary text-white' : 'bg-background-light/20 text-background-light/70'
                        }`}>
                          {match.status}
                        </span>
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

function GroupTable({ name, players }: { name: string, players: any[] }) {
  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl overflow-hidden">
      <div className="bg-primary/10 px-6 py-4 border-b border-primary/10">
        <h4 className="font-bold text-primary">{name}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-primary/5 text-background-light/70 uppercase text-xs font-bold">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">eFootball ID</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">D</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="px-4 py-3 text-center">GD</th>
              <th className="px-4 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/5">
            {players.map((p, i) => (
              <tr key={p.id} className="hover:bg-primary/5">
                <td className="px-4 py-4 font-bold text-primary">{i + 1}</td>
                <td className="px-4 py-4 font-bold">{p.name}</td>
                <td className="px-4 py-4 text-slate-400 font-mono text-xs">{p.efootballId}</td>
                <td className="px-4 py-4 text-center">{p.played || 0}</td>
                <td className="px-4 py-4 text-center">{p.wins || 0}</td>
                <td className="px-4 py-4 text-center">{p.draws || 0}</td>
                <td className="px-4 py-4 text-center">{p.losses || 0}</td>
                <td className="px-4 py-4 text-center">{p.gd || 0}</td>
                <td className="px-4 py-4 text-center font-bold text-secondary">{p.points || 0}</td>
              </tr>
            ))}
            {players.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">No players assigned yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
