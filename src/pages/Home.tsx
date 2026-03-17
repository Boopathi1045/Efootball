import { useState, useEffect } from "react";
import { Trophy, Calendar, Users, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";

export default function Home() {
  const [playerCount, setPlayerCount] = useState(0);
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch approved player count
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      setPlayerCount(count || 0);

      // Fetch tournaments
      const { data } = await supabase
        .from('tournaments')
        .select('id, name, createdAt, activeStage, isHidden')
        .eq('isHidden', false)
        .order('createdAt', { ascending: false });
      if (data) setTournaments(data);
    };

    fetchData();

    // Setup realtime subscriptions
    const playerChannel = supabase.channel('home_players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchData)
      .subscribe();

    const tourneyChannel = supabase.channel('home_tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(tourneyChannel);
    };
  }, []);

  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 49, 53, 0.8), rgba(0, 49, 53, 0.95)), url('/hero-bg.png')` }}
    >
      <header className="flex items-center justify-between border-b border-primary/20 px-4 md:px-20 py-3 md:py-4 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-3 md:gap-4">
          <Trophy className="text-primary w-6 h-6 md:w-8 md:h-8" />
          <h2 className="text-lg md:text-xl font-bold">eFootball Hub</h2>
        </div>
        <div className="flex gap-4">
          <Link to="/admin" className="px-3 py-1.5 md:px-4 md:py-2 bg-secondary text-white text-sm md:text-base rounded-xl hover:brightness-110 transition-all font-bold">
            Admin
          </Link>
        </div>
      </header>
      
      <main className="flex-1 px-4 md:px-20 py-6 md:py-12 max-w-[1000px] mx-auto w-full space-y-6 md:space-y-8">
        <h1 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-8 text-center md:text-left">Tournaments</h1>
        <div className="grid gap-4">
          {tournaments.length === 0 && (
            <div className="glass-panel p-6 text-center text-background-light font-bold">No Tournaments Found.</div>
          )}
          {tournaments.map(t => (
              <Link 
              key={t.id} 
              to={`/tournament/${encodeURIComponent(t.name)}`} 
              className="glass-panel p-4 md:p-6 rounded-xl hover:bg-primary/5 transition-all border border-primary/20 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-surface-dark flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(15,164,175,0.3)] shrink-0">
                  <Trophy className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-bold text-white group-hover:text-background-light transition-colors">{t.name}</h3>
                  <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-background-light/80 mt-1 md:mt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" /> {new Date(t.createdAt || Date.now()).toLocaleDateString()}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] md:text-[10px] font-bold uppercase bg-secondary text-white">{t.activeStage || "registration"}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 shrink-0 text-background-light/50 group-hover:text-background-light transition-colors" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
