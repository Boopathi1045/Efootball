import React, { useState } from "react";
import { LayoutGrid, Edit3, Trash2, XCircle, X } from "lucide-react";

interface StandingsOverrideProps {
  approvedPlayers: any[];
  overrideMode: boolean;
  onDeletePlayer: (id: string) => Promise<void>;
  onEditPlayerDetails: (id: string, updates: any) => Promise<void>;
  isSuperAdmin: boolean;
}

const StandingsOverride: React.FC<StandingsOverrideProps> = ({ 
  approvedPlayers, 
  overrideMode,
  onDeletePlayer, 
  onEditPlayerDetails,
  isSuperAdmin
}) => {
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({ name: "", phone: "", efootballId: "", group: "" });

  const openEditModal = (player: any) => {
    setEditingPlayer(player);
    setEditFormData({
      name: player.name || "",
      phone: player.phone || "",
      efootballId: player.efootballId || "",
      group: player.group || ""
    });
  };

  const handleSaveEdit = async () => {
    if (!editingPlayer) return;
    await onEditPlayerDetails(editingPlayer.id, editFormData);
    setEditingPlayer(null);
  };

  return (
    <>
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
                  {isSuperAdmin && overrideMode ? (
                    <>
                      <button 
                        onClick={() => openEditModal(p)} 
                        className="p-2 md:px-4 md:py-2 bg-white/5 text-white/40 hover:text-primary rounded-xl border border-white/5 hover:border-primary/20 transition-all text-xs font-black uppercase tracking-widest"
                      >
                        <Edit3 className="w-3.5 h-3.5 md:hidden" />
                        <span className="hidden md:inline">Edit</span>
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

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Edit Player</h3>
              <button onClick={() => setEditingPlayer(null)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Name</label>
                <input 
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-primary/50 outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">eFootball ID</label>
                <input 
                  value={editFormData.efootballId} 
                  onChange={e => setEditFormData({...editFormData, efootballId: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Phone Number</label>
                <input 
                  value={editFormData.phone} 
                  onChange={e => setEditFormData({...editFormData, phone: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-primary/50 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Group</label>
                <input 
                  value={editFormData.group} 
                  onChange={e => setEditFormData({...editFormData, group: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-primary/50 outline-none transition-all"
                  placeholder="e.g. A, B, C"
                />
              </div>

              <button 
                onClick={handleSaveEdit}
                className="w-full mt-4 h-[48px] bg-primary text-background-dark font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StandingsOverride;
