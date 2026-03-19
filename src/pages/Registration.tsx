import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { ArrowLeft, Info, PersonStanding, MessageCircle, Gamepad2, UploadCloud, X, CheckCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function Registration() {
  const navigate = useNavigate();
  const { id } = useParams();
  const handleBack = () => {
    if (window.history.length <= 1) {
      navigate('/');
    } else {
      navigate(-1);
    }
  };

  const [loading, setLoading] = useState(false);
  const [activeTournament, setActiveTournament] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "+91 ",
    efootballId: "",
  });
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);

  useEffect(() => {
    // Fetch all active tournaments and determine the active one
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('"isHidden"', false)
        .order('"createdAt"', { ascending: false });

      if (data && data.length > 0) {
        setTournaments(data);
        if (id) {
          const matched = data.find(t => t.id === id);
          if (matched) setActiveTournament(matched);
          else setActiveTournament(data[0]);
        } else {
          setActiveTournament(data[0]);
        }
      }
    };

    fetchTournaments();
    
    // Subscribe to tournament changes
    const channel = supabase.channel('registration_tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchTournaments)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

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
          "paymentScreenshotUrl": screenshotPreview || null,
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

      setShowSuccessModal(true);
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
  const availableTournaments = tournaments.filter(t => t.activeStage === 'registration' && t.id !== activeTournament?.id);

  if (!activeTournament) {
    return <div className="min-h-screen flex items-center justify-center bg-background-dark text-white">Loading tournament...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-dark">
      <header className="flex items-center p-4 justify-between sticky top-0 z-50 glass-panel">
        <button 
          onClick={handleBack}
          className="text-primary flex size-8 md:size-10 items-center justify-center cursor-pointer hover:bg-primary/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <h2 className="text-white text-base md:text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-8 md:pr-10 uppercase tracking-[0.1em]">
          Tournament Pro
        </h2>
      </header>

      <div className="flex flex-col gap-3 p-4 mt-2 max-w-2xl mx-auto w-full md:mt-6">
        <div className="flex gap-6 justify-between items-center">
          <p className="text-primary text-sm font-bold uppercase tracking-widest">Registration Status</p>
          <p className="text-white text-sm font-medium">Step 1 of 1</p>
        </div>
        <div className="rounded-full bg-primary/20 h-2 w-full overflow-hidden">
          <div className="h-full rounded-full bg-primary neon-glow" style={{ width: "100%" }}></div>
        </div>

        <div className="pt-4 md:pt-6 pb-2">
          <h3 className="text-white tracking-tight text-xl md:text-3xl font-extrabold leading-tight">{activeTournament.name}</h3>
          <p className="text-background-light/80 text-xs md:text-base font-normal mt-1 md:mt-2">Claim your glory. Complete the registration to secure your bracket position.</p>
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
              <div className="flex flex-col gap-1.5 md:gap-2">
                <label className="text-background-light text-xs md:text-sm font-semibold ml-1">Full Name</label>
                <div className="relative">
                  <PersonStanding className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-background-light/50 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 md:pl-12 pr-4 h-12 md:h-14 bg-primary/5 border border-primary/20 rounded-xl text-white text-sm md:text-base focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all" 
                    placeholder="Ex: John Doe" 
                    type="text"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:gap-2">
                <label className="text-background-light text-xs md:text-sm font-semibold ml-1">WhatsApp Number (Optional)</label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-background-light/50 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 md:pl-12 pr-4 h-12 md:h-14 bg-primary/5 border border-primary/20 rounded-xl text-white text-sm md:text-base focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all" 
                    placeholder="+91 ..." 
                    type="tel"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:gap-2">
                <label className="text-background-light text-xs md:text-sm font-semibold ml-1">eFootball Unique ID (Optional)</label>
                <div className="relative">
                  <Gamepad2 className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-background-light/50 w-4 h-4 md:w-5 md:h-5" />
                  <input 
                    value={formData.efootballId}
                    onChange={e => setFormData({...formData, efootballId: e.target.value})}
                    className="w-full pl-10 md:pl-12 pr-4 h-12 md:h-14 bg-primary/5 border border-primary/20 rounded-xl text-white text-sm md:text-base focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all" 
                    placeholder="123-456-789" 
                    type="text"
                  />
                </div>
              </div>

              {!isFreeTournament && (
                <div className="flex flex-col gap-2">
                  <label className="text-background-light text-sm font-semibold ml-1">Payment Screenshot</label>
                  
                  <input 
                    id="screenshot-upload"
                    type="file" 
                    required={!screenshotPreview} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />

                  {screenshotPreview ? (
                    <div className="relative w-full h-40 border-2 border-primary/30 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
                      <img 
                        src={screenshotPreview} 
                        alt="Preview" 
                        className="w-full h-full object-contain cursor-pointer opacity-90 group-hover:opacity-100 transition-opacity" 
                        onClick={() => setShowFullScreenshot(true)}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          setScreenshotPreview(null);
                          const fileInput = document.getElementById('screenshot-upload') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-1.5 rounded-full backdrop-blur-sm transition-all shadow-lg z-10"
                        title="Remove screenshot"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-md">
                          Click to view full image
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label 
                      htmlFor="screenshot-upload"
                      className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 gap-2">
                        <UploadCloud className="w-10 h-10 text-primary" />
                        <div className="text-center">
                          <p className="text-sm text-background-light font-medium">Tap to upload proof of payment</p>
                          <p className="text-xs text-background-light/50 mt-1">PNG, JPG or PDF (MAX. 5MB)</p>
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              )}

              <div className="mt-4">
                <button 
                  disabled={loading}
                  className="w-full h-12 md:h-14 bg-secondary text-white font-black text-base md:text-lg rounded-xl flex items-center justify-center gap-3 drop-shadow-[0_0_15px_rgba(150,71,52,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 border border-secondary/50" 
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
          <div className="py-12 md:py-20 animate-in fade-in zoom-in duration-500 w-full max-w-sm mx-auto">
            <div className="glass-panel rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 border border-white/5 bg-white/[0.02]">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <Info className="text-secondary w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h4 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white">
                  {activeTournament.activeStage === 'finished' ? 'Tournament Concluded' : 'Registration Closed'}
                </h4>
                <p className="text-background-light/50 text-xs md:text-sm max-w-xs mx-auto">
                  {activeTournament.activeStage === 'finished' ? (
                    <>This tournament has <span className="text-primary font-bold uppercase">concluded</span>.</>
                  ) : (
                    <>This tournament is now in the <span className="text-primary font-bold uppercase">{activeTournament.activeStage}</span> phase.</>
                  )}
                </p>
              </div>

              {availableTournaments.length > 0 ? (
                <div className="w-full flex flex-col gap-3 mt-2">
                  <p className="text-[10px] md:text-xs text-background-light/50 font-bold uppercase tracking-widest text-center mb-2">Available Tournaments</p>
                  {availableTournaments.map((t: any) => (
                    <Link 
                      key={t.id} 
                      to={`/register/${t.id}`}
                      className="w-full h-12 bg-primary/10 border border-primary/20 hover:bg-primary/20 flex items-center justify-center text-primary font-bold uppercase text-[10px] md:text-xs tracking-widest rounded-xl transition-all"
                    >
                      Apply for {t.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs md:text-sm text-background-light/40 italic mt-2 text-center">Stay tuned for future events!</p>
              )}

              <Link to="/" className="mt-2 w-full h-12 flex items-center justify-center bg-white/5 text-white/70 hover:text-white font-black uppercase text-[10px] md:text-xs tracking-widest rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Full Screenshot Modal */}
      {showFullScreenshot && screenshotPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <button 
            type="button"
            onClick={() => setShowFullScreenshot(false)}
            className="absolute top-4 right-4 text-white hover:text-primary bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all cursor-pointer z-50"
          >
            <X className="w-8 h-8 md:w-10 md:h-10" />
          </button>
          <img 
            src={screenshotPreview} 
            alt="Full Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl relative z-40"
          />
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-background-dark border border-primary/30 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_40px_rgba(0,255,170,0.15)] flex flex-col items-center text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 neon-glow">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2 uppercase tracking-tight">Registration Submitted</h3>
            <p className="text-background-light/80 text-sm mb-6">
              Your registration has been submitted successfully! Waiting for admin approval.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate("/");
              }}
              className="w-full h-12 bg-primary text-background-dark font-black text-base md:text-lg rounded-xl flex items-center justify-center hover:bg-primary/90 active:scale-[0.98] transition-all uppercase tracking-widest"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
