import React from "react";
import { LayoutGrid, Edit3, Trash2, XCircle } from "lucide-react";

interface StandingsOverrideProps {
  approvedPlayers: any[];
  onDeletePlayer: (id: string) => Promise<void>;
  onEditPlayer: (id: string, newName: string) => Promise<void>;
  overrideMode: boolean;
}

const StandingsOverride: React.FC<StandingsOverrideProps> = ({ 
  approvedPlayers, 
  onDeletePlayer, 
  onEditPlayer,
  overrideMode
}) => {
  return (
    <section className="glass-panel rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col border border-white/5 bg-white/[0.01] backdrop-blur-xl">
      <header className="p-4 md:p-7 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.02] gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutGrid className="text-primary w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Board Override</h3>
            <p className="text-[9px] md:text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{approvedPlayers.length} Active Players</p>
          </div>
        </div>
      </header>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] text-[9px] md:text-[11px] text-white/40 uppercase tracking-widest">
            <tr>
              <th className="px-5 md:px-8 py-4 md:py-5 font-black">Player Identity</th>
              <th className="px-5 md:px-8 py-4 md:py-5 font-black text-center">Group</th>
              <th className="px-5 md:px-8 py-4 md:py-5 font-black text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {approvedPlayers.sort((a,b) => (a.group || '').localeCompare(b.group || '')).map(p => (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 md:px-8 py-4 md:py-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] md:text-sm font-bold text-white group-hover:text-primary transition-colors">{p.name}</span>
                    <span className="text-[9px] md:text-[11px] text-white/10 font-mono">{p.id.substring(0,8)}...</span>
                  </div>
                </td>
                <td className="px-5 md:px-8 py-4 md:py-6 text-center">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] md:text-xs font-black text-white/40 uppercase italic tracking-tighter border border-white/5">
                    Group {p.group || '—'}
                  </span>
                </td>
                <td className="px-5 md:px-8 py-4 md:py-6 text-right space-x-2 md:space-x-3">
                  {overrideMode ? (
                    <>
                      <button 
                        onClick={() => {
                          const newName = prompt("Edit Player Name:", p.name);
                          if (newName && newName !== p.name) onEditPlayer(p.id, newName);
                        }} 
                        className="p-2 md:px-4 md:py-2 bg-white/5 text-white/40 hover:text-primary rounded-xl border border-white/5 hover:border-primary/20 transition-all text-xs font-black uppercase tracking-widest"
                      >
                        <Edit3 className="w-3.5 h-3.5 md:hidden" />
                        <span className="hidden md:inline">Rename</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Remove ${p.name} from tournament? This will delete their matches.`)) onDeletePlayer(p.id);
                        }} 
                        className="p-2 md:px-4 md:py-2 bg-red-500/10 text-red-400/50 hover:text-red-400 rounded-xl border border-red-500/10 transition-all text-xs font-black uppercase tracking-widest"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:hidden" />
                        <span className="hidden md:inline">Delete</span>
                      </button>
                    </>
                  ) : (
                    <XCircle className="w-4 h-4 inline text-white/5" />
                  )}
                </td>
              </tr>
            ))}
            {approvedPlayers.length === 0 && (
              <tr><td colSpan={3} className="px-8 py-12 text-center text-white/20 italic text-sm">No approved players to display.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default StandingsOverride;
