import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { ArrowLeft, Info, PersonStanding, MessageCircle, Gamepad2, UploadCloud } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Registration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "+91 ",
    efootballId: "",
  });
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the most recently created tournament to show registration rules for it
    const fetchTournament = async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('"isHidden"', false)
        .order('"createdAt"', { ascending: false });

      if (data && data.length > 0) {
        setActiveTournament(data[0]);
      }
    };

    fetchTournament();
    
    // Subscribe to tournament changes
    const channel = supabase.channel('registration_tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchTournament)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!activeTournament) throw new Error("No active tournament found.");
      // Simulate file upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error: insertError } = await supabase.from('players').insert([
        {
          ...formData,
          "tournamentId": activeTournament.id,
          "paymentScreenshotUrl": "https://via.placeholder.com/150?text=Payment+Proof", // Placeholder
          status: "pending",
          "group": "None",
          points: 0,
          gd: 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          "createdAt": new Date().toISOString(),
        }
      ]);

      if (insertError) throw insertError;

      alert("Registration submitted successfully! Waiting for admin approval.");
      navigate("/");
    } catch (error) {
      console.error("Error registering:", error);
      alert("Failed to register: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setScreenshotPreview(null);
    }
  };

  const isFreeTournament = !activeTournament?.entryFee || activeTournament?.entryFee === "0" || activeTournament?.entryFee === 0;

  if (!activeTournament) {
    return <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">Loading tournament...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-dark">
      <header className="flex items-center p-4 justify-between sticky top-0 z-50 glass-panel">
        <Link to="/" className="text-primary flex size-10 items-center justify-center cursor-pointer">
          <ArrowLeft />
        </Link>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10 uppercase tracking-[0.1em]">
          Tournament Pro
        </h2>
      </header>

      <div className="flex flex-col gap-3 p-4 mt-2 max-w-2xl mx-auto w-full">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-primary text-sm font-bold uppercase tracking-widest">Registration Status</p>
          <p className="text-white text-sm font-medium">Step 1 of 1</p>
        </div>
        <div className="rounded-full bg-primary/20 h-2 w-full overflow-hidden">
          <div className="h-full rounded-full bg-primary neon-glow" style={{ width: "100%" }}></div>
        </div>

        <div className="pt-6 pb-2">
          <h3 className="text-white tracking-tight text-3xl font-extrabold leading-tight">{activeTournament.name}</h3>
          <p className="text-background-light/80 text-base font-normal mt-2">Claim your glory. Complete the registration to secure your bracket position.</p>
        </div>

        {activeTournament.activeStage === 'registration' ? (
          <>
            {!isFreeTournament && (
              <div className="py-4 text-left">
                <div className="glass-panel rounded-xl p-4 border-l-4 border-primary bg-primary/5">
                  <div className="flex items-start gap-3">
                    <Info className="text-primary mt-1 w-6 h-6" />
                    <div className="w-full">
                      <h4 className="text-primary font-bold text-sm uppercase">Payment Instructions</h4>
                      <p className="text-background-light text-xs mt-1 leading-relaxed">
                        Transfer <b className="text-primary">₹{activeTournament.entryFee} Entry Fee</b> to the official tournament number/UPI: <b className="text-primary">{activeTournament.paymentNumber || "Not set"}</b>. Take a screenshot of the confirmation to upload below.
                      </p>
                      {activeTournament.paymentQrUrl && (
                        <div className="mt-4 flex flex-col items-center bg-background-dark p-4 rounded-lg border border-primary/20">
                          <p className="text-xs text-background-light/70 mb-2 uppercase tracking-widest font-bold">Scan to Pay</p>
                          <img src={activeTournament.paymentQrUrl} alt="Payment QR" className="w-40 h-40 object-contain rounded-lg bg-white p-2" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-4 mb-20 text-left">
              <div className="flex flex-col gap-2">
                <label className="text-background-light text-sm font-semibold ml-1">Full Name</label>
                <div className="relative">
                  <PersonStanding className="absolute left-4 top-1/2 -translate-y-1/2 text-background-light/50 w-5 h-5" />
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 pr-4 h-14 bg-primary/5 border border-primary/20 rounded-xl text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all" 
                    placeholder="Ex: John Doe" 
                    type="text"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-background-light text-sm font-semibold ml-1">WhatsApp Number</label>
                <div className="relative">
                  <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-background-light/50 w-5 h-5" />
                  <input 
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-12 pr-4 h-14 bg-primary/5 border border-primary/20 rounded-xl text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all" 
                    placeholder="+91 ..." 
                    type="tel"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-background-light text-sm font-semibold ml-1">eFootball Unique ID</label>
                <div className="relative">
                  <Gamepad2 className="absolute left-4 top-1/2 -translate-y-1/2 text-background-light/50 w-5 h-5" />
                  <input 
                    required
                    value={formData.efootballId}
                    onChange={e => setFormData({...formData, efootballId: e.target.value})}
                    className="w-full pl-12 pr-4 h-14 bg-primary/5 border border-primary/20 rounded-xl text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all" 
                    placeholder="123-456-789" 
                    type="text"
                  />
                </div>
              </div>

              {!isFreeTournament && (
                <div className="flex flex-col gap-2">
                  <label className="text-background-light text-sm font-semibold ml-1">Payment Screenshot</label>
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors overflow-hidden relative">
                    {screenshotPreview ? (
                      <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 text-primary mb-2" />
                        <p className="text-sm text-background-light/80">Tap to upload proof of payment</p>
                        <p className="text-xs text-background-light/50 mt-1">PNG, JPG or PDF (MAX. 5MB)</p>
                      </div>
                    )}
                    <input type="file" required className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              )}

              <div className="mt-4">
                <button 
                  disabled={loading}
                  className="w-full h-14 bg-secondary text-white font-black text-lg rounded-xl flex items-center justify-center gap-3 drop-shadow-[0_0_15px_rgba(150,71,52,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 border border-secondary/50" 
                  type="submit"
                >
                  {loading ? "SUBMITTING..." : "SUBMIT REGISTRATION"}
                </button>
              </div>
              <p className="text-center text-xs text-background-light/60 px-4">
                By submitting, you agree to our Tournament Rules and Code of Conduct. Brackets will be released 24h before kick-off.
              </p>
            </form>
          </>
        ) : (
          <div className="py-20 animate-in fade-in zoom-in duration-500">
            <div className="glass-panel rounded-3xl p-10 flex flex-col items-center gap-6 border border-white/5 bg-white/[0.02]">
              <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <Info className="text-secondary w-10 h-10" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white">Registration Closed</h4>
                <p className="text-background-light/50 text-sm max-w-xs mx-auto">This tournament is now in the <span className="text-primary font-bold uppercase">{activeTournament.activeStage}</span> phase. Stay tuned for future events!</p>
              </div>
              <Link to="/" className="mt-4 px-8 py-4 bg-white/5 text-white font-black uppercase text-xs tracking-widest rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
