import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on home page
  if (location.pathname === "/" || location.pathname === "/tournament") {
    return null;
  }

  return (
    <button
      onClick={() => navigate(-1)}
      className="fixed bottom-6 left-6 z-[60] w-12 h-12 bg-primary/20 backdrop-blur-xl border border-primary/30 rounded-full flex items-center justify-center text-primary shadow-glow hover:bg-primary/30 transition-all active:scale-90 md:bottom-10 md:left-10"
      title="Go Back"
    >
      <ArrowLeft className="w-6 h-6" />
    </button>
  );
}
