import { useState, useEffect } from "react";
import { Trophy, Calendar, Users, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

export default function Home() {
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const unsubPlayers = onSnapshot(query(collection(db, "players"), where("status", "==", "approved")), (snapshot) => {
      setPlayerCount(snapshot.size);
    });
    return () => unsubPlayers();
  }, []);

  const tournaments = [
    { 
      id: "elite-2024", 
      name: "Elite Championship 2024", 
      status: "Active", 
      participants: playerCount, 
      date: "Mar 2024" 
    }
  ];

  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 49, 53, 0.8), rgba(0, 49, 53, 0.95)), url('/hero-bg.png')` }}
    >
      <header className="flex items-center justify-between border-b border-primary/20 px-6 md:px-20 py-4 glass-panel sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Trophy className="text-primary w-8 h-8" />
          <h2 className="text-xl font-bold">eFootball Hub</h2>
        </div>
        <div className="flex gap-4">
          <Link to="/admin" className="px-4 py-2 bg-secondary text-white rounded-xl hover:brightness-110 transition-all font-bold">
            Admin
          </Link>
        </div>
      </header>
      
      <main className="flex-1 px-6 md:px-20 py-12 max-w-[1000px] mx-auto w-full space-y-8">
        <h1 className="text-4xl font-black text-white mb-8">Tournaments</h1>
        <div className="grid gap-4">
          {tournaments.map(t => (
            <Link 
              key={t.id} 
              to={`/tournament/${t.id}`} 
              className="glass-panel p-6 rounded-xl hover:bg-primary/5 transition-all border border-primary/20 flex items-center justify-between group"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-surface-dark flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(15,164,175,0.3)]">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-background-light transition-colors">{t.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-background-light/80 mt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {t.date}</span>
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {t.participants} Players</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary text-white">{t.status}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-background-light/50 group-hover:text-background-light transition-colors" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
