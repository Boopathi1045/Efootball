import React from "react";
import { Edit3, Trash2 } from "lucide-react";

interface StandingsOverrideProps {
  approvedPlayers: any[];
  overrideMode: boolean;
  setOverrideMode: (value: boolean) => void;
  updatePlayerStats: (id: string, field: string, value: any) => void;
  deletePlayer: (id: string) => void;
}

const StandingsOverride: React.FC<StandingsOverrideProps> = ({
  approvedPlayers,
  overrideMode,
  setOverrideMode,
  updatePlayerStats,
  deletePlayer
}) => {
  return (
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
  );
};

export default StandingsOverride;
