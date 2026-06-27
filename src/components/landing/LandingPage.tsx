import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring, useMotionValue } from "motion/react";
import { useNavigate } from "react-router-dom";

// Particles Component (Floating glowing particle dots)
const Particles = () => (
  <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
    {Array.from({ length: 25 }).map((_, i) => {
      const size = 3 + Math.floor(Math.random() * 3); // random 3px to 5px
      const left = Math.random() * 100;
      const speed = 4 + Math.random() * 5; // 4s to 9s
      const delay = Math.random() * 6;
      
      const colors = ["#FFFFFF", "#14F1D9", "#7C5CFC"];
      const color = colors[i % colors.length];
      const glowColor = color === "#FFFFFF" 
        ? "rgba(255, 255, 255, 0.8)" 
        : color === "#14F1D9" 
        ? "rgba(20, 241, 217, 0.8)" 
        : "rgba(124, 92, 252, 0.8)";

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
);

// Orb Component (Pure CSS glowing orb/ring)
const GlowingOrb = () => (
  <div className="custom-orb left-1/2 top-1/3 -translate-x-1/2 pointer-events-none" />
);

// Floating Card Component (Up/Down Smooth Infinite Loop, interactive & draggable!)
const FloatingCard = ({ delay, className, initialY, children }: { delay: number; className: string; initialY: number[]; children: React.ReactNode }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      drag
      dragConstraints={{ left: -120, right: 120, top: -120, bottom: 120 }}
      dragElastic={0.2}
      dragTransition={{ bounceStiffness: 500, bounceDamping: 20 }}
      whileHover={{ 
        scale: 1.05, 
        y: initialY[1] * 0.8,
        boxShadow: "0 25px 50px -12px rgba(124, 92, 252, 0.45)",
        borderColor: "rgba(124, 92, 252, 0.6)"
      }}
      whileTap={{ scale: 0.98, cursor: "grabbing" }}
      animate={isHovered ? {} : { y: initialY }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      transition={isHovered ? { duration: 0.2, ease: "easeOut" } : { duration: 7 + Math.random() * 3, repeat: Infinity, ease: "easeInOut", delay }}
      className={`absolute rounded-2xl border bg-[#0A0A0F]/90 backdrop-blur-xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-grab pointer-events-auto transition-colors duration-300 border-white/10 ${className}`}
    >
      {/* Glassmorphism subtle gradient highlight line */}
      <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#14F1D9]/30 to-transparent" />
      {children}
    </motion.div>
  );
};

// Animated Counter Component
const Counter = ({ target }: { target: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          let start = 0;
          const duration = 2000; // 2 seconds
          const startTime = performance.now();

          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quad
            const ease = progress * (2 - progress);
            setCount(Math.floor(ease * target));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Sandbox State Management
  const [demoInput, setDemoInput] = useState("CS301 final assignment due in 30 minutes, need extension");
  const [demoState, setDemoState] = useState<'idle' | 'scanning' | 'thinking' | 'drafting' | 'ready'>('idle');
  const [demoResult, setDemoResult] = useState<any>(null);
  const [typewriterText, setTypewriterText] = useState("");

  const quickTries = [
    { text: "Missed CS301 capstone project report deadline...", value: "Missed CS301 capstone project report deadline, need academic emergency policy" },
    { text: "Q3 investor roadmap sync starting in 45 min...", value: "Q3 investor roadmap sync starting in 45 minutes, conflicts with flight, auto-re-schedule" },
    { text: "Google Cloud startup grant submission form", value: "Google Cloud startup grant submission form deadline tonight, draft elevator pitch and submit logs" }
  ];

  const handleRunDemo = async (customPrompt?: string) => {
    const promptToUse = customPrompt || demoInput;
    if (customPrompt) {
      setDemoInput(customPrompt);
    }
    setDemoState('scanning');
    setDemoResult(null);
    setTypewriterText("");

    try {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptToUse })
      });
      const data = await response.json();
      
      setDemoState('drafting');
      setDemoResult({
        subject: data.draftSubject || "Autonomous Execution Task",
        body: data.draftBody || "Dear Professor, I am writing to ask...",
        reasoning: data.agentReasoning || "Agent executed fallback grace policy.",
        confidence: 99
      });
      setDemoState('ready');
    } catch (err) {
      // Graceful fallback
      setDemoState('drafting');
      setTimeout(() => {
        setDemoResult({
          subject: "Extension Request: Capstone Project",
          body: "Dear Professor, due to an unforeseen medical situation, I kindly request a 24-hour extension on the capstone report. I've attached my progress log.",
          reasoning: "CS301 late submission policy grants 24-hour grace periods for documented emergencies.",
          confidence: 96
        });
        setDemoState('ready');
      }, 1000);
    }
  };

  // Typewriter effect simulation for the generated result body
  useEffect(() => {
    if (demoState === 'ready' && demoResult?.body) {
      let index = 0;
      const interval = setInterval(() => {
        setTypewriterText((prev) => prev + demoResult.body.charAt(index));
        index++;
        if (index >= demoResult.body.length) {
          clearInterval(interval);
        }
      }, 15);
      return () => clearInterval(interval);
    }
  }, [demoState, demoResult]);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F1F0FF] overflow-x-hidden font-sans selection:bg-[#7C5CFC]/30 bg-grid-blueprint relative">
      
      {/* Navbar with Frosted Glass effect */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'scrolled-navbar border-b border-white/5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.8)]' : 'py-5'}`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          {/* Logo with subtle glow and lightning bolt icon */}
          <div className="flex items-center gap-3 text-2xl font-display font-bold tracking-tight select-none">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 10 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C5CFC] to-[#14F1D9] flex items-center justify-center text-[#0A0A0F] font-bold shadow-[0_0_15px_rgba(124,92,252,0.4)]"
            >
              ⚡
            </motion.div>
            <span className="acto-logo-text bg-clip-text text-transparent bg-gradient-to-r from-white to-[#E4E4E7]">
              ACTO
            </span>
          </div>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9CA3AF]">
            <a href="#how-it-works" className="hover:text-white transition-colors duration-200">How it Works</a>
            <a href="#sandbox" className="hover:text-[#14F1D9] transition-colors duration-200 flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#14F1D9] animate-ping" />
              Live Sandbox
            </a>
            <a href="#grid" className="hover:text-white transition-colors duration-200">Autonomous Grid</a>
          </div>

          {/* Workstation CTA Button with continuous glow and shimmer */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/15 text-lg transition-all duration-200 shadow-md cursor-pointer pointer-events-auto"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                localStorage.setItem('acto_active_tab', 'settings');
                navigate("/dashboard");
              }}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/15 text-lg transition-all duration-200 shadow-md cursor-pointer pointer-events-auto"
              title="System Settings"
            >
              ⚙️
            </motion.button>
             <motion.button 
              whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(20, 241, 217, 0.6)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                localStorage.setItem('acto_active_tab', 'feed');
                navigate("/dashboard");
              }} 
              className="relative overflow-hidden px-6 py-2.5 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] text-[#0A0A0F] font-bold rounded-full text-sm animate-pulse-glow"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] animate-shimmer" />
              ⚡ ENTER WORKSTATION →
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Cursor Follower Glow Effect */}
      <motion.div
        className="fixed top-0 left-0 w-96 h-96 rounded-full bg-[#7C5CFC]/10 blur-[130px] pointer-events-none z-50"
        style={{ 
          x: useSpring(mouseX, { stiffness: 60, damping: 25 }), 
          y: useSpring(mouseY, { stiffness: 60, damping: 25 }), 
          marginLeft: -192, 
          marginTop: -192 
        }}
      />

      {/* Hero Interactive Canvas and Background Assets */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <GlowingOrb />
        <Particles />

        {/* 4 Premium Glassmorphism Floating Cards in Background */}
        {/* Card 1: GMAIL_AUTODRAFT */}
        <FloatingCard 
          delay={0} 
          initialY={[0, -40, 0]} 
          className="hidden lg:block top-[22%] left-[4%] w-80 border-[#7C5CFC]/30 text-[#F1F0FF] select-none scale-90 xl:scale-100 -rotate-3 hover:border-[#14F1D9]"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-mono font-bold text-[#14F1D9] tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14F1D9] animate-ping" />
              📧 GMAIL_AUTODRAFT
            </span> 
            <span className="text-[10px] font-semibold bg-[#14F1D9]/20 text-[#14F1D9] px-2.5 py-0.5 rounded-full border border-[#14F1D9]/30">99% CONF</span>
          </div>
          <div className="text-sm font-semibold tracking-tight">Investor Q3 Deck Follow-up</div>
          <div className="text-[11px] text-[#9CA3AF] mt-1.5 font-mono">To: partners@sequoia.com</div>
          <div className="mt-3 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] h-full w-4/5 rounded-full" />
          </div>
        </FloatingCard>

        {/* Card 2: CRISIS RECOVERY (Red Border Glow) */}
        <FloatingCard 
          delay={1.8} 
          initialY={[0, -60, 0]} 
          className="hidden lg:block top-[24%] right-[4%] w-96 border-red-500/30 text-[#F1F0FF] select-none scale-90 xl:scale-100 rotate-2 shadow-[0_15px_30px_rgba(239,68,68,0.15)] hover:border-red-500"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-mono font-bold text-red-400 tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              🚨 CRISIS RECOVERY
            </span> 
            <span className="text-[10px] font-semibold bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/30">OVERDUE</span>
          </div>
          <div className="text-sm font-semibold tracking-tight">CS301 Architecture Report</div>
          <div className="text-xs text-red-200 mt-2.5 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
            <span>⚡</span> Apology email + repository link auto-dispatched
          </div>
        </FloatingCard>

        {/* Card 3: CALENDAR_SYNC */}
        <FloatingCard 
          delay={3.2} 
          initialY={[0, 40, 0]} 
          className="hidden lg:block top-[62%] left-[6%] w-72 border-purple-500/20 text-[#F1F0FF] select-none scale-85 xl:scale-95 rotate-3 hover:border-purple-400"
        >
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-mono font-bold text-[#7C5CFC] tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC] animate-ping" />
              📅 CALENDAR_SYNC
            </span> 
            <span className="text-[10px] font-semibold bg-[#7C5CFC]/20 text-[#A78BFA] px-2.5 py-0.5 rounded-full border border-[#7C5CFC]/30">1-TAP ✓</span>
          </div>
          <div className="text-sm font-semibold tracking-tight">Reschedule Design Standup</div>
          <div className="text-[11px] text-purple-300/80 mt-1.5 font-mono">Resolved conflict: 2pm → 4:30pm</div>
        </FloatingCard>

        {/* Card 4: SLACK_DISPATCH */}
        <FloatingCard 
          delay={2.5} 
          initialY={[0, -50, 0]} 
          className="hidden lg:block top-[58%] right-[5%] w-80 border-cyan-500/20 text-[#F1F0FF] select-none scale-85 xl:scale-95 -rotate-2 hover:border-cyan-400"
        >
          <div className="flex justify-between items-center mb-2.5">
            <span className="text-xs font-mono font-bold text-[#14F1D9] tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              💬 SLACK_DISPATCH
            </span> 
            <span className="text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-500/20">READY</span>
          </div>
          <div className="text-sm font-semibold tracking-tight">UX Audit Sign-off Request</div>
          <div className="text-[11px] text-cyan-300/70 mt-1.5 font-mono">Posted draft to #product-feedback</div>
        </FloatingCard>
      </div>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 z-10">
        
        {/* Startup Showcase Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[#14F1D9]/20 bg-[#14F1D9]/5 text-[#14F1D9] text-xs font-mono font-semibold tracking-wider mb-8 shadow-[0_0_15px_rgba(20,241,217,0.1)]"
        >
          <span className="w-2 h-2 rounded-full bg-[#14F1D9] animate-ping" />
          YC S26 STARTUP SHOWCASE • Autonomous Deadline Executor
        </motion.div>

        {/* Hero Headline */}
        <div className="max-w-5xl mx-auto mb-8 relative">
          {/* Big glowing orb behind the headline */}
          <div 
            style={{
              position: "absolute",
              width: "600px",
              height: "600px",
              background: "radial-gradient(circle, rgba(124,92,252,0.4) 0%, rgba(20,241,217,0.1) 50%, transparent 70%)",
              borderRadius: "50%",
              filter: "blur(80px)",
              animation: "pulse 4s ease infinite",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: -1,
              pointerEvents: "none"
            }}
          />

          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-6xl md:text-[110px] font-display font-bold tracking-tight leading-[0.9] text-white"
          >
            Your deadlines.<br />
            <motion.span 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }} 
              className="block mt-4"
              style={{
                background: "linear-gradient(90deg, #7C5CFC, #14F1D9, #7C5CFC)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                animation: "shimmer 3s linear infinite",
              }}
            >
              Handled.
            </motion.span>
          </motion.h1>
        </div>

        {/* Hero Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="text-xl md:text-3xl text-[#E4E4E7] mb-12 max-w-3xl mx-auto font-light leading-relaxed"
        >
          ACTO is your <span className="underline decoration-2 decoration-[#7C5CFC] font-semibold text-white">AI Chief Task Officer</span>. It doesn't remind you about looming deadlines — <span className="text-[#14F1D9] font-medium text-glow-teal">it actively executes the work for you.</span>
        </motion.p>

        {/* Call to Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-6"
        >
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(20, 241, 217, 0.7)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              localStorage.setItem('acto_active_tab', 'feed');
              navigate("/dashboard");
            }} 
            className="relative overflow-hidden px-10 py-5 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] text-[#0A0A0F] font-black rounded-full shadow-[0_0_25px_rgba(124,92,252,0.4)] text-lg tracking-wider"
          >
            <div className="absolute inset-0 w-full h-full bg-white/20 translate-x-[-100%] animate-shimmer" />
            ⚡ GET STARTED FREE
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.12)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.getElementById("sandbox")?.scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-5 bg-white/5 border border-white/10 hover:border-white/20 rounded-full font-bold text-lg transition-all duration-300 backdrop-blur-md flex items-center gap-3 text-[#F1F0FF]"
          >
            ▶ Watch Live Demo
          </motion.button>
        </motion.div>

        {/* Value Trust Seals */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="text-[#9CA3AF] text-sm font-medium tracking-wide flex flex-wrap gap-4 justify-center items-center opacity-80"
        >
          <span>✓ No credit card required</span>
          <span className="text-white/10">•</span>
          <span>⚡ 2-second setup</span>
          <span className="text-white/10">•</span>
          <span>🔒 SOC-2 Type II secure</span>
        </motion.div>
      </section>

      {/* PLATFORMS INTEGRATIONS & METRIC BANNER */}
      <section id="grid" className="py-16 border-t border-b border-white/5 bg-[#07070B]/90 relative z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-8 items-center">
          
          {/* Neural Engine Badge */}
          <div className="md:col-span-4 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#14F1D9] animate-ping" />
            <span className="text-xs font-mono font-bold tracking-wider text-purple-400">
              POWERED BY GEMINI 1.5 PRO NEURAL ENGINE
            </span>
          </div>

          {/* Core App Integrations Logos */}
          <div className="md:col-span-5 flex flex-wrap gap-8 justify-center md:justify-start items-center text-[#9CA3AF]">
            <span className="flex items-center gap-2 text-sm font-semibold hover:text-white transition-colors">
              💼 <span className="font-display">Google Workspace</span>
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold hover:text-white transition-colors">
              📧 <span>Gmail API</span>
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold hover:text-[#14F1D9] transition-colors">
              📅 <span>Calendar v3</span>
            </span>
            <span className="flex items-center gap-2 text-sm font-semibold hover:text-white transition-colors">
              ✓ <span>Tasks Cloud</span>
            </span>
          </div>

          {/* Autonomous metric counter */}
          <div className="md:col-span-3 flex justify-center md:justify-end">
            <div className="px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
              <span className="text-2xl font-bold font-mono text-[#14F1D9] text-glow-teal">
                <Counter target={4821} />
              </span>
              <span className="text-[10px] font-mono tracking-wider text-[#9CA3AF] leading-tight">
                DEADLINES HANDLED<br />AUTONOMOUSLY
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* THE AUTONOMOUS WORKFLOW (How ACTO Eliminates Deadline Stress) */}
      <section id="how-it-works" className="py-32 max-w-7xl mx-auto px-6 relative z-10 scroll-mt-20">
        
        {/* Centered Monospace header */}
        <div className="text-center mb-20">
          <div className="text-[#14F1D9] font-mono font-bold tracking-widest text-xs mb-3">
            // THE AUTONOMOUS WORKFLOW
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight">
            How ACTO Eliminates Deadline Stress
          </h2>
        </div>

        {/* 3 Step-by-Step Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            whileHover={{ y: -8, borderColor: "rgba(124, 92, 252, 0.3)" }}
            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-10">
                <div className="w-16 h-16 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(124,92,252,0.15)]">
                  🔗
                </div>
                <div className="text-6xl font-black text-white/5 font-display select-none">01</div>
              </div>
              <div className="text-xs font-mono font-bold text-purple-400 uppercase mb-2">Step 01</div>
              <h3 className="text-2xl font-bold mb-4 text-white">Connect Google Workspace</h3>
              <p className="text-[#9CA3AF] leading-relaxed mb-8">
                1-click OAuth integration. ACTO securely scans incoming Gmail notices, calendar invites, and syllabus PDFs for hidden deadlines.
              </p>
            </div>
            <div className="text-xs font-semibold text-[#14F1D9] flex items-center gap-1.5 pt-4 border-t border-white/5">
              <span>⚡</span> Zero manual data entry
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            whileHover={{ y: -8, borderColor: "rgba(20, 241, 217, 0.3)" }}
            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-10">
                <div className="w-16 h-16 rounded-2xl bg-[#14F1D9]/10 border border-[#14F1D9]/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(20,241,217,0.15)]">
                  🤖
                </div>
                <div className="text-6xl font-black text-white/5 font-display select-none">02</div>
              </div>
              <div className="text-xs font-mono font-bold text-[#14F1D9] uppercase mb-2">Step 02</div>
              <h3 className="text-2xl font-bold mb-4 text-white">Agent Monitors & Formulates</h3>
              <p className="text-[#9CA3AF] leading-relaxed mb-8">
                Gemini 1.5 Pro parses intent, reviews prior email threads to match your exact voice tone, and pre-compiles ready-to-send deliverables.
              </p>
            </div>
            <div className="text-xs font-semibold text-[#14F1D9] flex items-center gap-1.5 pt-4 border-t border-white/5">
              <span>⚡</span> Autonomous drafts pre-compiled
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ y: -8, borderColor: "rgba(124, 92, 252, 0.3)" }}
            className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 transition-all duration-300 relative group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-10">
                <div className="w-16 h-16 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(124,92,252,0.15)]">
                  ✅
                </div>
                <div className="text-6xl font-black text-white/5 font-display select-none">03</div>
              </div>
              <div className="text-xs font-mono font-bold text-purple-400 uppercase mb-2">Step 03</div>
              <h3 className="text-2xl font-bold mb-4 text-white">You Just Approve (1-Tap)</h3>
              <p className="text-[#9CA3AF] leading-relaxed mb-8">
                Review executive action cards on mobile or desktop. One tap dispatches the email, files the form, or reschedules the meeting.
              </p>
            </div>
            <div className="text-xs font-semibold text-[#14F1D9] flex items-center gap-1.5 pt-4 border-t border-white/5">
              <span>⚡</span> 1-click execution dispatch
            </div>
          </motion.div>

        </div>
      </section>

      {/* LIVE INTERACTIVE SANDBOX SECTION */}
      <section id="sandbox" className="py-32 max-w-6xl mx-auto px-6 relative z-10 scroll-mt-20">
        
        {/* Sandbox Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14F1D9]/10 border border-[#14F1D9]/30 text-[#14F1D9] text-xs font-mono mb-4 shadow-[0_0_15px_rgba(20,241,217,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#14F1D9] animate-ping" />
            ⚡ LIVE INTERACTIVE SANDBOX
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight mb-4">
            Test ACTO's Autonomous Kernel
          </h2>
          <p className="text-xl text-[#9CA3AF] max-w-2xl mx-auto font-light">
            Type or select a simulated crisis. Watch Gemini 1.5 Pro generate a production-ready approval card in real time.
          </p>
        </div>

        {/* Sandbox Glass Container */}
        <div className="rounded-3xl border border-white/10 bg-[#0A0A0F]/60 backdrop-blur-xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          
          {/* Text Area & Generate Button Container */}
          <div className="relative">
            <textarea 
              value={demoInput} 
              onChange={(e) => setDemoInput(e.target.value)} 
              className="w-full h-36 px-6 py-5 rounded-2xl bg-[#07070B] border border-white/10 focus:border-[#14F1D9] text-white text-lg font-light focus:outline-none transition-colors placeholder-[#9CA3AF]/40 resize-none pr-44"
              placeholder="Describe a deadline crisis (e.g. Need extension on Q4 audit)..."
            />
            <div className="absolute right-4 bottom-4">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRunDemo()}
                disabled={demoState === 'scanning' || demoState === 'drafting'}
                className="px-8 py-4 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] text-[#0A0A0F] font-black rounded-xl hover:shadow-[0_0_20px_rgba(20,241,217,0.4)] transition-all flex items-center gap-2"
              >
                {demoState === 'scanning' ? "🔍 SCANNING..." : demoState === 'drafting' ? "⚙️ DRAFTING..." : "⚡ GENERATE BRIEF"}
              </motion.button>
            </div>
          </div>

          {/* Quick Try Suggestions */}
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <span className="text-xs font-mono text-[#7C5CFC] tracking-wider uppercase font-bold">// QUICK TRY:</span>
            {quickTries.map((tryItem, idx) => (
              <button 
                key={idx}
                onClick={() => handleRunDemo(tryItem.value)}
                className="text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#14F1D9]/40 text-[#F1F0FF] hover:text-[#14F1D9] transition-all duration-300"
              >
                "{tryItem.text}"
              </button>
            ))}
          </div>

          {/* Under-the-hood Realtime Output Panel */}
          <div className="mt-10 border-t border-white/10 pt-10">
            <div className="text-center text-xs font-mono text-[#9CA3AF] tracking-widest uppercase mb-8">
              // GENERATED LIVE BRIEF // READY FOR AUTH
            </div>

            <AnimatePresence mode="wait">
              {demoState === 'idle' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 text-[#9CA3AF]/40 italic font-mono"
                >
                  Enter a crisis prompt above and click generate to trigger kernel...
                </motion.div>
              )}

              {(demoState === 'scanning' || demoState === 'drafting') && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 gap-4"
                >
                  <div className="w-12 h-12 rounded-full border-2 border-t-[#14F1D9] border-white/5 animate-spin" />
                  <div className="text-sm font-mono text-[#14F1D9] animate-pulse">
                    {demoState === 'scanning' ? "🔍 SCANNING INCOMING METADATA & SYLLABUS..." : "🧠 COMPILING OPTIMAL ACTION FLOW..."}
                  </div>
                </motion.div>
              )}

              {demoState === 'ready' && demoResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="max-w-3xl mx-auto rounded-2xl border border-[#7C5CFC]/30 bg-purple-950/[0.03] p-6 shadow-[0_0_30px_rgba(124,92,252,0.1)] relative overflow-hidden"
                >
                  {/* Decorative glowing accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full" />
                  
                  {/* Card header */}
                  <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 font-bold">✨ AI Chief Task Officer Draft</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#14F1D9] bg-[#14F1D9]/10 px-3 py-1 rounded-full border border-[#14F1D9]/20">
                      {demoResult.confidence}% confidence score
                    </div>
                  </div>

                  {/* Card Info details */}
                  <div className="space-y-4 font-sans text-left">
                    <div>
                      <span className="text-xs font-mono text-[#9CA3AF] block mb-1">DRAFT SUBJECT:</span>
                      <div className="text-white font-semibold text-lg">{demoResult.subject}</div>
                    </div>

                    <div>
                      <span className="text-xs font-mono text-[#9CA3AF] block mb-1">DRAFT COMPILATION:</span>
                      <div className="p-4 rounded-xl bg-[#07070B] border border-white/5 text-[#E4E4E7] font-mono text-sm leading-relaxed min-h-[100px] whitespace-pre-wrap select-text">
                        {typewriterText}
                        <span className="inline-block w-2 h-4 bg-[#14F1D9] animate-pulse ml-0.5" />
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-mono text-[#9CA3AF] block mb-1">AGENT LOGICAL RESOLUTION:</span>
                      <div className="text-[#14F1D9] text-sm font-mono flex items-center gap-2">
                        <span>💡</span> {demoResult.reasoning}
                      </div>
                    </div>
                  </div>

                  {/* Approve action dispatch simulator */}
                  <div className="mt-8 flex gap-4">
                    <button 
                      onClick={() => {
                        localStorage.setItem('acto_active_tab', 'feed');
                        navigate("/dashboard");
                      }}
                      className="flex-1 py-4 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] text-[#0A0A0F] font-bold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                    >
                      🚀 APPROVE & EXECUTE
                    </button>
                    <button 
                      onClick={() => { setDemoState('idle'); setDemoResult(null); }}
                      className="px-6 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                    >
                      DISMISS
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </section>

      {/* FINAL STOP LETTING DEADLINES WIN CTA */}
      <section className="py-40 text-center relative z-10 border-t border-white/5 bg-[#07070B]/40">
        <div className="max-w-4xl mx-auto px-6">
          
          {/* Logo element badge centered */}
          <div className="flex justify-center mb-8">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 rounded-3xl bg-[#7C5CFC]/10 border-2 border-[#14F1D9]/40 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(124,92,252,0.3)]"
            >
              ⚡
            </motion.div>
          </div>

          <h2 className="text-5xl md:text-8xl font-display font-bold mb-6 text-white leading-tight">
            Stop letting deadlines win.
          </h2>

          <p className="text-xl md:text-2xl text-[#9CA3AF] mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Don't be reminded. <span className="text-[#14F1D9] font-bold text-glow-teal">Be done.</span> Step into the autonomous workspace built for world-class founders.
          </p>

          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 45px rgba(20, 241, 217, 0.8)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              localStorage.setItem('acto_active_tab', 'feed');
              navigate("/dashboard");
            }} 
            className="px-12 py-6 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] text-[#0A0A0F] font-black rounded-full text-xl shadow-[0_0_35px_rgba(124,92,252,0.5)] tracking-wider"
          >
            ⚡ START WITH ACTO — IT'S FREE →
          </motion.button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-white/5 bg-[#050508] relative z-10 text-center text-sm text-[#9CA3AF]/60 font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            &copy; 2026 ACTO Autonomous Kernel. All rights reserved.
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-[#14F1D9] transition-colors">Security Policy</a>
            <a href="#" className="hover:text-[#14F1D9] transition-colors">API Reference</a>
            <a href="#" className="hover:text-[#14F1D9] transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
