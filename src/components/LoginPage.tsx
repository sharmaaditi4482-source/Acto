import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("Arjun Mehta");
  const [selectedConnections, setSelectedConnections] = useState<string[]>(["gmail", "calendar"]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    if (savedTheme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, []);

  const toggleConnection = (id: string) => {
    if (selectedConnections.includes(id)) {
      setSelectedConnections(selectedConnections.filter(c => c !== id));
    } else {
      setSelectedConnections([...selectedConnections, id]);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Save preferences to backend and redirect
      fetch("/api/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      }).finally(() => {
        navigate("/dashboard");
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F1F0FF] flex items-center justify-center p-6 relative font-sans overflow-hidden bg-grid-blueprint">
      
      {/* Background Particles (Same as Landing Page) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 15 }).map((_, i) => {
          const size = 3 + (i % 3); // 3px to 5px
          const left = (i * 7.3) % 100;
          const speed = 7 + (i % 4); // 7s to 10s
          const delay = (i % 3) * 1.8;
          
          const colors = ["#FFFFFF", "#14F1D9", "#7C5CFC"];
          const color = colors[i % colors.length];
          const glowColor = color === "#FFFFFF" 
            ? "rgba(255, 255, 255, 0.6)" 
            : color === "#14F1D9" 
            ? "rgba(20, 241, 217, 0.6)" 
            : "rgba(124, 92, 252, 0.6)";

          return (
            <div
              key={i}
              className="custom-particle"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${left}%`,
                top: "100%",
                backgroundColor: color,
                boxShadow: `0 0 10px ${glowColor}, 0 0 4px ${glowColor}`,
                animationDuration: `${speed}s`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Ambient Glowing Orbs (Same as Landing Page) */}
      <div className="custom-orb left-1/3 top-1/4 -translate-x-1/2 pointer-events-none z-0" />
      <div className="custom-orb right-1/4 bottom-1/3 translate-x-1/2 pointer-events-none z-0 opacity-40 animate-[pulse_6s_infinite]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md p-8 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-xl shadow-2xl relative z-10"
      >
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-8">
          <span className="text-xl font-display font-bold">
            A<span className="text-[#14F1D9]">⚡</span>CTO
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  s === step ? "w-6 bg-[#7C5CFC]" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-5xl mb-4 block">👋</span>
              <h2 className="text-3xl font-display font-bold mb-2">Welcome to ACTO</h2>
              <p className="text-sm text-[#9CA3AF]">
                Let's set up your personal AI Chief Task Officer environment.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-[#9CA3AF] uppercase tracking-wider font-mono">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#0A0A0F] border border-white/10 text-[#F1F0FF] focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-[#7C5CFC] hover:bg-[#A78BFA] text-white font-semibold rounded-2xl transition-all duration-300 active:scale-95 shadow-xl shadow-[#7C5CFC]/10"
            >
              Continue 🚀
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-5xl mb-4 block">🔌</span>
              <h2 className="text-3xl font-display font-bold mb-2">Connect Your Feeds</h2>
              <p className="text-sm text-[#9CA3AF]">
                ACTO monitors your emails and calendar events to discover deadlines.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { id: "gmail", name: "Gmail Integration", desc: "Scan inbox for deadline updates", emoji: "📧" },
                { id: "calendar", name: "Google Calendar", desc: "Read upcoming syncs & sync agendas", emoji: "📅" },
                { id: "tasks", name: "Google Tasks", desc: "Keep task lists up-to-date", emoji: "📋" }
              ].map((conn) => (
                <div
                  key={conn.id}
                  onClick={() => toggleConnection(conn.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between ${
                    selectedConnections.includes(conn.id)
                      ? "bg-[#7C5CFC]/10 border-[#7C5CFC]"
                      : "bg-[#0A0A0F] border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{conn.emoji}</span>
                    <div className="text-left">
                      <div className="text-sm font-semibold">{conn.name}</div>
                      <div className="text-xs text-[#9CA3AF]">{conn.desc}</div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    selectedConnections.includes(conn.id)
                      ? "bg-[#14F1D9] border-[#14F1D9] text-[#0A0A0F]"
                      : "border-white/20"
                  }`}>
                    {selectedConnections.includes(conn.id) && "✓"}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-[#7C5CFC] hover:bg-[#A78BFA] text-white font-semibold rounded-2xl transition-all duration-300 active:scale-95 shadow-xl shadow-[#7C5CFC]/10"
            >
              Verify Connections 🔐
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <span className="text-5xl mb-4 block">⚡</span>
              <h2 className="text-3xl font-display font-bold mb-2">Setup Complete</h2>
              <p className="text-sm text-[#9CA3AF] mb-6">
                Your AI Chief Task Officer is ready to deploy and monitor deadlines.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#0A0A0F] border border-white/5 space-y-3 text-left">
              <div className="flex items-center gap-2">
                <span className="text-[#14F1D9]">✓</span>
                <span className="text-sm font-mono text-[#9CA3AF]">User Profile: {name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#14F1D9]">✓</span>
                <span className="text-sm font-mono text-[#9CA3AF]">Google OAuth Scope: Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#14F1D9]">✓</span>
                <span className="text-sm font-mono text-[#9CA3AF]">AI Tone: Balanced-Professional</span>
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] hover:from-[#A78BFA] hover:to-[#14F1D9] text-[#0A0A0F] font-bold rounded-2xl transition-all duration-300 active:scale-95 shadow-xl"
            >
              Enter Dashboard 🚀
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
