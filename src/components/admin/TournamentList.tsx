import React from "react";
import { Trophy, LogOut, ChevronLeft, Eye, EyeOff, Trash2, Settings, ArrowRightLeft, Plus } from "lucide-react";

interface TournamentListProps {
  tournaments: any[];
  loading: boolean;
  isCreating: boolean;
  setIsCreating: (value: boolean) => void;
  newTourneyName: string;
  setNewTourneyName: (value: string) => void;
  handleBack: () => void;
  handleLogout: () => void;
  toggleTournamentVisibility: (e: React.MouseEvent, t: any) => void;
  deleteTournament: (e: React.MouseEvent, t: any) => void;
  setTournaments: React.Dispatch<React.SetStateAction<any[]>>;
  setSelectedTournament: (t: any) => void;
  setEditTitleValue: (value: string) => void;
  createTournament: () => void;
  isSuperAdmin: boolean;
  navigate: (path: string) => void;
  supabase: any;
}

const TournamentList: React.FC<TournamentListProps> = ({
  tournaments,
  isCreating,
  setIsCreating,
  newTourneyName,
  setNewTourneyName,
  handleBack,
  handleLogout,
  toggleTournamentVisibility,
  deleteTournament,
  setTournaments,
  setSelectedTournament,
  setEditTitleValue,
  createTournament,
  isSuperAdmin,
  navigate,
  supabase
}) => {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background-dark/80 backdrop-blur-md px-4 md:px-6 py-2 md:py-3">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={handleBack}
              className="p-1.5 md:p-2 hover:bg-primary/10 rounded-full transition-colors text-slate-400 hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <Trophy className="text-primary w-6 h-6 md:w-8 md:h-8" />
            <h2 className="text-lg md:text-xl font-black tracking-tighter uppercase italic">eFootball Admin</h2>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-primary/10 rounded-lg text-slate-400 hover:text-primary transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-lg glass-panel p-6 md:p-10 rounded-3xl md:rounded-[2.5rem] flex flex-col gap-6 md:gap-8 border border-white/5">
          <div className="flex flex-col gap-2 text-center">
            <h3 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase">Select Tournament</h3>
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Choose a domain to manage</p>
          </div>
          <div className="flex flex-col gap-4">
            {tournaments.length === 0 && !isCreating && (
              <div className="text-center p-4 text-slate-500 text-sm">No tournaments exist yet. Create one!</div>
            )}
            {tournaments.map(t => (
              <div key={t.id} className="group relative glass-panel p-4 md:p-6 rounded-2xl md:rounded-3xl flex flex-col gap-4 md:gap-5 border border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_40px_rgba(33,197,94,0.1)]">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1 md:gap-1.5">
                    <h4 className={`text-xl md:text-2xl font-black italic uppercase tracking-tighter transition-all ${t.isHidden ? 'text-white/20 line-through' : 'text-primary'}`}>{t.name}</h4>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${t.isHidden ? 'bg-white/10' : 'bg-primary animate-pulse shadow-[0_0_8px_rgba(15,164,175,0.5)]'}`}></div>
                      <p className="text-[9px] md:text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">{t.isHidden ? 'Offline' : 'Live on Site'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 md:gap-2">
                    {isSuperAdmin && (
                      <button
                        onClick={(e) => toggleTournamentVisibility(e, t)}
                        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl border transition-all duration-300 ${t.isHidden ? 'bg-slate-800/50 border-slate-700 text-slate-500 hover:bg-slate-800' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:scale-105'}`}
                        title={t.isHidden ? "Show Publicly" : "Hide from Public"}
                      >
                        {t.isHidden ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" />}
                      </button>
                    )}
                    
                    {isSuperAdmin && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteTournament(e, t);
                        }}
                        className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105"
                        title="Delete Tournament"
                      >
                        <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 items-end">
                  <div className="flex flex-col gap-1.5 md:gap-2">
                    <label className="text-[9px] md:text-[10px] font-black text-white/20 uppercase tracking-[0.2em] ml-1">Current Phase</label>
                    <div className="relative">
                      <select
                        value={t.activeStage || "registration"}
                        onChange={async (e) => {
                          const newStage = e.target.value;
                          setTournaments(prev => prev.map(item => item.id === t.id ? { ...item, activeStage: newStage } : item));
                          const { error } = await supabase.from('tournaments').update({ activeStage: newStage }).eq('id', t.id);
                          if (error) alert("Failed to change stage: " + error.message);
                        }}
                        className="w-full bg-background-dark/80 backdrop-blur-md border border-white/5 rounded-xl md:rounded-2xl px-3 md:px-5 h-10 md:h-[52px] text-[10px] md:text-xs font-black uppercase tracking-widest text-white outline-none focus:border-primary/40 appearance-none cursor-pointer hover:bg-background-dark transition-colors"
                      >
                        <option value="registration">Registration</option>
                        <option value="draw">Draw</option>
                        <option value="groups">Group Stage</option>
                        <option value="knockout">Knockout</option>
                      </select>
                      <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-background-light/30">
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
                    className="h-10 md:h-[52px] w-full bg-primary text-background-dark font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] px-4 md:px-8 rounded-xl md:rounded-2xl hover:brightness-110 transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 shadow-[0_10px_25px_rgba(15,164,175,0.2)] active:scale-95"
                  >
                    Enter Dashboard <ArrowRightLeft className="w-3 h-3 md:w-3.5 md:h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {isSuperAdmin && (
              isCreating ? (
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
                    <button onClick={createTournament} className="bg-secondary text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:brightness-110">
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full h-[56px] md:h-[72px] border border-dashed border-white/5 rounded-xl md:rounded-[1.5rem] flex items-center justify-center gap-3 text-white/20 hover:bg-white/5 hover:border-primary/30 transition-all text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider px-4 md:px-5 py-2.5"
                >
                  <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                  <span>Start New Tournament</span>
                </button>
              )
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default TournamentList;
