import React, { useState, useEffect } from "react";
import { Users, Plus, Globe, Search, ArrowRight, X, Edit3 } from "lucide-react";

interface PlayerDirectoryProps {
  tournaments: any[];
  isSuperAdmin: boolean;
  supabase: any;
  showAlert: (title: string, message: string) => void;
}

const PlayerDirectory: React.FC<PlayerDirectoryProps> = ({
  tournaments,
  isSuperAdmin,
  supabase,
  showAlert
}) => {
  const [globalPlayers, setGlobalPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAddExistingModal, setShowAddExistingModal] = useState(false);
  const [showAddNewModal, setShowAddNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [editPlayerData, setEditPlayerData] = useState({ name: "", efootballId: "", phone: "" });
  const [originalEditIdent, setOriginalEditIdent] = useState<any>(null);
  const [targetTournamentId, setTargetTournamentId] = useState<string>("");

  const [newPlayerData, setNewPlayerData] = useState({ name: "", efootballId: "", phone: "", group: "None" });

  useEffect(() => {
    fetchGlobalPlayers();
  }, []);

  const fetchGlobalPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('name, efootballId, phone, "createdAt"')
      .order('"createdAt"', { ascending: false });
      
    if (error) {
      console.error("Error fetching global players:", error);
    } else if (data) {
      const unique: any[] = [];
      const seen = new Set();
      data.forEach((p: any) => {
        // Use eFootball ID as primary uniqueness check, fallback to name
        const key = (p.efootballId || p.name || "").toLowerCase().trim();
        if (key && !seen.has(key)) {
          seen.add(key);
          unique.push(p);
        }
      });
      setGlobalPlayers(unique);
    }
    setLoading(false);
  };

  const activeTournaments = tournaments.filter(t => t.activeStage !== 'finished');

  const handleAddExistingToTournament = async () => {
    if (!selectedPlayer || !targetTournamentId) return;

    const tournament = tournaments.find(t => t.id === targetTournamentId);
    if (!tournament) return;

    const { data: existingCheck } = await supabase
      .from('players')
      .select('id')
      .eq('tournamentId', targetTournamentId)
      .eq('name', selectedPlayer.name);

    if (existingCheck && existingCheck.length > 0) {
      showAlert("Duplicate", `${selectedPlayer.name} is already registered in ${tournament.name}.`);
      return;
    }

    const { error } = await supabase.from('players').insert([
      {
        name: selectedPlayer.name,
        efootballId: selectedPlayer.efootballId,
        phone: selectedPlayer.phone,
        tournamentId: targetTournamentId,
        status: "approved",
        group: "None",
        createdAt: new Date().toISOString()
      }
    ]);

    if (error) {
      showAlert("Add Error", "Failed to add player: " + error.message);
    } else {
      showAlert("Success", `${selectedPlayer.name} has been added to ${tournament.name}!`);
      setShowAddExistingModal(false);
      setSelectedPlayer(null);
      setTargetTournamentId("");
    }
  };

  const handleAddNewPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTournamentId) {
      showAlert("Required field", "Please select a tournament to add this player to.");
      return;
    }

    const tournament = tournaments.find(t => t.id === targetTournamentId);

    const { error } = await supabase.from('players').insert([
      {
        ...newPlayerData,
        tournamentId: targetTournamentId,
        status: "approved",
        createdAt: new Date().toISOString()
      }
    ]);

    if (error) {
      showAlert("Add Error", "Failed to add player: " + error.message);
    } else {
      showAlert("Success", `${newPlayerData.name} has been created and added to ${tournament?.name}!`);
      setShowAddNewModal(false);
      setNewPlayerData({ name: "", efootballId: "", phone: "", group: "None" });
      setTargetTournamentId("");
      fetchGlobalPlayers(); // Refresh the list
    }
  };

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalEditIdent) return;

    let query = supabase.from('players').update({
      name: editPlayerData.name,
      efootballId: editPlayerData.efootballId,
      phone: editPlayerData.phone
    }).eq('name', originalEditIdent.name);

    if (originalEditIdent.phone) {
      query = query.eq('phone', originalEditIdent.phone);
    }

    const { error } = await query;

    if (error) {
      showAlert("Edit Error", "Failed to update globally: " + error.message);
    } else {
      showAlert("Success", `${editPlayerData.name} has been updated globally across all tournaments!`);
      setShowEditModal(false);
      setOriginalEditIdent(null);
      fetchGlobalPlayers();
    }
  };

  const filteredPlayers = globalPlayers.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.efootballId && p.efootballId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <section className="glass-panel rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col border border-white/5 bg-white/[0.01] backdrop-blur-xl">
        <header className="p-4 md:p-7 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.02] gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Globe className="text-orange-500 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="text-sm md:text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Player Directory</h3>
              <p className="text-[9px] md:text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{globalPlayers.length} Unique Profiles Found</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search globally..." 
                className="w-full bg-background-dark/80 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-orange-500/50 outline-none transition-all"
              />
            </div>
            {isSuperAdmin && (
              <button 
                onClick={() => setShowAddNewModal(true)} 
                className="w-full sm:w-auto bg-orange-500/10 text-orange-500 font-extrabold uppercase text-[9px] md:text-[11px] tracking-wider px-4 md:px-5 py-2.5 rounded-xl border border-orange-500/20 hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> New Registration
              </button>
            )}
          </div>
        </header>

        <div className="overflow-x-auto custom-scrollbar min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-white/40 italic text-sm">Loading global directory...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] text-[9px] md:text-[11px] text-white/40 uppercase tracking-widest">
                <tr>
                  <th className="px-5 md:px-8 py-4 md:py-5 font-black">Player Identity</th>
                  <th className="hidden md:table-cell px-8 py-5 font-black text-center">Contact</th>
                  <th className="px-5 md:px-8 py-4 md:py-5 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPlayers.map((p, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 md:px-8 py-4 md:py-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[12px] md:text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{p.name}</span>
                        <span className="text-[9px] md:text-[11px] text-white/30 font-medium">ID: {p.efootballId || 'N/A'}</span>
                        <span className="text-[9px] md:text-[11px] text-white/30 font-medium md:hidden">{p.phone}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-8 py-6 text-center">
                      <span className="px-3 py-1.5 bg-background-dark/50 border border-white/5 rounded-lg font-mono text-xs text-white/50">{p.phone || 'N/A'}</span>
                    </td>
                    <td className="px-5 md:px-8 py-4 md:py-6 text-right space-x-2">
                      {isSuperAdmin ? (
                        <>
                          <button 
                            onClick={() => {
                              setOriginalEditIdent(p);
                              setEditPlayerData({ name: p.name || "", efootballId: p.efootballId || "", phone: p.phone || "" });
                              setShowEditModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 md:py-2 bg-white/5 text-white/50 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-500/10 hover:text-orange-400 border border-white/5 hover:border-orange-500/20 transition-all"
                            title="Edit Global Profile"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedPlayer(p);
                              setShowAddExistingModal(true);
                            }} 
                            className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white/5 text-white/50 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-orange-500/10 hover:text-orange-400 border border-white/5 hover:border-orange-500/20 transition-all"
                          >
                            <span className="hidden sm:inline">Add to Tourney</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-white/10 tracking-widest italic">Locked</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPlayers.length === 0 && (
                  <tr><td colSpan={3} className="px-8 py-12 text-center text-white/20 italic text-sm">No players found in the directory.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Add Existing Player Modal */}
      {showAddExistingModal && selectedPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-[2.5rem] border border-orange-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Import Player</h3>
              <button 
                onClick={() => {
                  setShowAddExistingModal(false);
                  setSelectedPlayer(null);
                  setTargetTournamentId("");
                }} 
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-6">
              <p className="text-sm font-bold text-white mb-1">{selectedPlayer.name}</p>
              <p className="text-xs text-white/50">ID: {selectedPlayer.efootballId || 'N/A'}</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Select Tournament</label>
                <select 
                  value={targetTournamentId} 
                  onChange={e => setTargetTournamentId(e.target.value)} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Choose Active Tournament --</option>
                  {activeTournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleAddExistingToTournament}
                disabled={!targetTournamentId}
                className="w-full mt-4 h-[48px] bg-orange-500 text-background-dark font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Player Modal */}
      {showAddNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-[2.5rem] border border-orange-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">New Global Registration</h3>
              <button 
                onClick={() => {
                  setShowAddNewModal(false);
                  setTargetTournamentId("");
                  setNewPlayerData({ name: "", efootballId: "", phone: "", group: "None" });
                }} 
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddNewPlayer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Full Name</label>
                <input 
                  required
                  value={newPlayerData.name} 
                  onChange={e => setNewPlayerData({...newPlayerData, name: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition-all"
                  placeholder="e.g. Lionel Messi"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">eFootball ID</label>
                <input 
                  value={newPlayerData.efootballId} 
                  onChange={e => setNewPlayerData({...newPlayerData, efootballId: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition-all"
                  placeholder="000-000-000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Phone Number</label>
                <input 
                  value={newPlayerData.phone} 
                  onChange={e => setNewPlayerData({...newPlayerData, phone: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition-all"
                  placeholder="+91 ..."
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="text-[10px] uppercase font-black tracking-widest text-orange-400 ml-1">Target Tournament</label>
                <select 
                  required
                  value={targetTournamentId} 
                  onChange={e => setTargetTournamentId(e.target.value)} 
                  className="w-full bg-black/40 border border-orange-500/30 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/80 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Assign to Tournament --</option>
                  {activeTournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <button 
                type="submit"
                disabled={!targetTournamentId}
                className="w-full mt-4 h-[48px] bg-orange-500 text-background-dark font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register & Add
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Global Player Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-[2.5rem] border border-orange-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Edit Global Profile</h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setOriginalEditIdent(null);
                }} 
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditPlayer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Full Name</label>
                <input 
                  required
                  value={editPlayerData.name} 
                  onChange={e => setEditPlayerData({...editPlayerData, name: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition-all"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">eFootball ID</label>
                <input 
                  value={editPlayerData.efootballId} 
                  onChange={e => setEditPlayerData({...editPlayerData, efootballId: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition-all"
                  placeholder="000-000-000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-1">Phone Number</label>
                <input 
                  value={editPlayerData.phone} 
                  onChange={e => setEditPlayerData({...editPlayerData, phone: e.target.value})} 
                  className="w-full bg-background-dark/50 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500/50 outline-none transition-all"
                  placeholder="+91 ..."
                />
              </div>

              <button 
                type="submit"
                className="w-full mt-4 h-[48px] bg-orange-500 text-background-dark font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-orange-500/10"
              >
                Save Changes Globally
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerDirectory;
