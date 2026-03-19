import React, { useState } from "react";
import { Users, Plus, Eye, CheckCircle2, XCircle, X } from "lucide-react";

interface PlayerManagementProps {
  pendingPlayers: any[];
  updatePlayerStatus: (id: string, status: string) => void;
  overrideMode: boolean;
  isSuperAdmin: boolean;
}

const PlayerManagement: React.FC<PlayerManagementProps> = ({
  pendingPlayers,
  updatePlayerStatus,
  overrideMode,
  isSuperAdmin
}) => {
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  return (
    <>
      <section className="glass-panel rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col border border-white/5 bg-white/[0.01] backdrop-blur-xl">
      <header className="p-4 md:p-7 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/[0.02] gap-4">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="text-primary w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-xl font-black text-white italic tracking-tighter uppercase mb-0.5">Player Management</h3>
            <p className="text-[9px] md:text-[11px] text-white/30 font-extrabold uppercase tracking-wider">{pendingPlayers.length} Pending Approval</p>
          </div>
        </div>
      </header>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left">
          <thead className="bg-white/[0.02] text-[9px] md:text-[11px] text-white/40 uppercase tracking-widest">
            <tr>
              <th className="px-5 md:px-8 py-4 md:py-5 font-black">Registrant</th>
              <th className="hidden md:table-cell px-8 py-5 font-black text-center">In-Game ID</th>
              <th className="px-5 md:px-8 py-4 md:py-5 font-black text-center">Payment</th>
              <th className="px-5 md:px-8 py-4 md:py-5 font-black text-right">Verification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pendingPlayers.map(player => (
              <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-5 md:px-8 py-4 md:py-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] md:text-sm font-bold text-white group-hover:text-primary transition-colors">{player.name}</span>
                    <span className="text-[9px] md:text-[11px] text-white/30 font-medium md:hidden">{player.efootballId}</span>
                    <span className="text-[9px] md:text-[11px] text-white/30 font-medium">{player.phone}</span>
                  </div>
                </td>
                <td className="hidden md:table-cell px-8 py-6 text-center">
                  <span className="px-3 py-1.5 bg-background-dark/50 border border-white/5 rounded-lg font-mono text-xs text-primary/80">{player.efootballId}</span>
                </td>
                <td className="px-5 md:px-8 py-4 md:py-6 text-center">
                  {player.paymentScreenshotUrl ? (
                    <button 
                      onClick={() => setSelectedScreenshot(player.paymentScreenshotUrl)}
                      className="inline-flex items-center gap-1.5 md:gap-2 text-[8px] md:text-[10px] font-black uppercase text-white/40 hover:text-primary transition-colors bg-white/5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-white/5"
                    >
                      <Eye className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden sm:inline">View Slip</span>
                    </button>
                  ) : (
                    <span className="text-[9px] md:text-[10px] text-white/10 font-black uppercase italic">No Slip</span>
                  )}
                </td>
                <td className="px-5 md:px-8 py-4 md:py-6 text-right space-x-1.5 md:space-x-2">
                  {isSuperAdmin && overrideMode ? (
                    <>
                      <button onClick={() => updatePlayerStatus(player.id, "approved")} className="px-2.5 md:px-4 py-1.5 md:py-2 bg-primary/10 text-primary text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-primary/20 border border-primary/20 transition-all"><CheckCircle2 className="w-3.5 h-3.5 md:hidden" /><span className="hidden md:inline">Approve</span></button>
                      <button onClick={() => updatePlayerStatus(player.id, "banned")} className="px-2.5 md:px-4 py-1.5 md:py-2 bg-secondary/10 text-secondary text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg md:rounded-xl hover:bg-secondary/20 border border-secondary/20 transition-all"><XCircle className="w-3.5 h-3.5 md:hidden" /><span className="hidden md:inline">Reject</span></button>
                    </>
                  ) : (
                    <span className="text-[9px] font-black uppercase text-white/10 tracking-widest italic">Locked</span>
                  )}
                </td>
              </tr>
            ))}
            {pendingPlayers.length === 0 && (
              <tr><td colSpan={4} className="px-8 py-12 text-center text-white/20 italic text-sm">No registrations awaiting review.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
      
      {/* Full Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedScreenshot(null)}
            className="absolute top-4 right-4 text-white hover:text-primary bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer z-50"
          >
            <X className="w-8 h-8 md:w-10 md:h-10" />
          </button>
          <img 
            src={selectedScreenshot} 
            alt="Payment Slip Full Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl relative z-40"
          />
        </div>
      )}
    </>
  );
};

export default PlayerManagement;
