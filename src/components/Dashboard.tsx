import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { useNavigate } from "react-router-dom";

import { Deadline, AgentAction, ConnectedAccount, UserPreferences } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light';
    const initial = saved || 'dark';

    // Synchronously set the class on the root element to ensure correct default theme
    if (initial === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    return initial;
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

  const [activeTab, setActiveTab] = useState<'feed' | 'recovery' | 'voice' | 'analytics' | 'settings'>(() => {
    const saved = localStorage.getItem('acto_active_tab');
    if (saved && ['feed', 'recovery', 'voice', 'analytics', 'settings'].includes(saved)) {
      localStorage.removeItem('acto_active_tab');
      return saved as any;
    }
    return 'feed';
  });
  
  // App States
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    name: "Arjun Mehta",
    email: "arjun.mehta@university.edu",
    aiTone: "balanced",
    voiceActive: true
  });

  // Master-Detail High-Density States
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [currentAction, setCurrentAction] = useState<AgentAction | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [cotIndex, setCotIndex] = useState(0);
  const [activePlaybook, setActivePlaybook] = useState<string>("negotiate");
  const [isCalendarScheduled, setIsCalendarScheduled] = useState<boolean>(false);
  const [isSchedulingCalendar, setIsSchedulingCalendar] = useState<boolean>(false);
  const [outlineCompletedSteps, setOutlineCompletedSteps] = useState<Record<string, boolean>>({});

  // Voice State
  const [voiceInput, setVoiceInput] = useState("");
  const [parsedVoiceResult, setParsedVoiceResult] = useState<Deadline | null>(null);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Connected accounts
  const [connections, setConnections] = useState<ConnectedAccount[]>([
    { id: "gmail", name: "Gmail Integration", icon: "📧", connected: true, email: "arjun.mehta@university.edu" },
    { id: "calendar", name: "Google Calendar", icon: "📅", connected: true, email: "arjun.mehta@university.edu" },
    { id: "tasks", name: "Google Tasks", icon: "📋", connected: true, email: "arjun.mehta@university.edu" }
  ]);

  // System historical activity logs for high-density sidebar
  const [logs, setLogs] = useState([
    { time: "12:12 AM", desc: "Agent scanned Gmail & Calendar feeds successfully." },
    { time: "12:05 AM", desc: "Arjun connected Google Tasks API." },
    { time: "11:58 PM", desc: "Agent automatically drafted recovery request for Physics Lab Report." },
    { time: "11:45 PM", desc: "Arjun customized AI tone style parameter to Balanced." }
  ]);

  // High-fidelity dynamic review flow states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [typedBody, setTypedBody] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const triggerConfetti = () => {
    setConfettiActive(true);
    setTimeout(() => {
      setConfettiActive(false);
    }, 2500);
  };

  // Synchronize typewriter animation with modal mount
  useEffect(() => {
    if (isReviewModalOpen && editedBody) {
      setIsTyping(true);
      setTypedBody("");
      let index = 0;
      const text = editedBody;
      const interval = setInterval(() => {
        setTypedBody((prev) => {
          const next = prev + text.charAt(index);
          index++;
          if (index >= text.length) {
            clearInterval(interval);
            setIsTyping(false);
          }
          return next;
        });
      }, 5);
      return () => clearInterval(interval);
    }
  }, [isReviewModalOpen]);

  // Load Data from backend
  const refreshData = async () => {
    try {
      const dRes = await fetch("/api/deadlines");
      const dData = await dRes.json();
      setDeadlines(dData);

      const aRes = await fetch("/api/actions");
      const aData = await aRes.json();
      setActions(aData);

      const pRes = await fetch("/api/preferences");
      const pData = await pRes.json();
      setPreferences(pData);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Default selection to first active deadline on boot
  useEffect(() => {
    if (deadlines.length > 0 && !selectedDeadline) {
      const activeDl = deadlines.find(d => d.status === "active") || deadlines[0];
      handleReviewAction(activeDl);
    }
  }, [deadlines]);

  // Sync state timer
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
          setVoiceInput(finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          showToast("Microphone access blocked. Click the simulate button or adjust frame permissions.");
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    } else {
      setSpeechSupported(false);
    }
  }, []);

  // Suggested Actions triggers
  const handleReviewAction = async (deadline: Deadline, playbookOverride?: string) => {
    setSelectedDeadline(deadline);
    setIsSuggesting(true);
    setCotIndex(0);
    setIsCalendarScheduled(false);
    setIsSchedulingCalendar(false);

    const playbookToUse = playbookOverride || "negotiate";
    setActivePlaybook(playbookToUse);

    // Simulated staggered CoT steps for UI effect
    const stepsTimer = setInterval(() => {
      setCotIndex(prev => prev + 1);
    }, 600);

    try {
      const res = await fetch("/api/agent/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadlineId: deadline.id, playbook: playbookToUse })
      });
      const data = await res.json();
      clearInterval(stepsTimer);
      setCurrentAction(data);
      setEditedSubject(data.draftSubject || "");
      setEditedBody(data.draftBody || "");
      setIsSuggesting(false);
    } catch (err) {
      clearInterval(stepsTimer);
      setIsSuggesting(false);
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    if (!currentAction) return;
    
    // Optimistic Update
    setCurrentAction(prev => prev ? { ...prev, status: "executing" } : null);

    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, editedSubject, editedBody })
      });
      await res.json();
      
      // Close review modal if open
      setIsReviewModalOpen(false);

      // Trigger high-fidelity celebration and confirmation toast
      triggerConfetti();
      showToast("✅ Sent by ACTO Agent");

      // Update logs
      setLogs(prev => [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: `Dispatched auto-remedy mail: ${currentAction.draftSubject}` },
        ...prev
      ]);

      setCurrentAction(null);
      // Select another deadline
      const nextDl = deadlines.find(d => d.id !== selectedDeadline?.id && d.status === 'active');
      if (nextDl) {
        handleReviewAction(nextDl);
      } else {
        setSelectedDeadline(null);
      }
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      await fetch("/api/agent/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId })
      });
      setCurrentAction(null);
      setSelectedDeadline(null);
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  // Create Manual Deadline
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newCat, setNewCat] = useState<'work' | 'study' | 'personal'>('work');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          dueAt: newDue || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          category: newCat,
          source: "manual",
          contactName: "DevOps Team",
          contactEmail: "devops.internal@company.com"
        })
      });
      const data = await res.json();
      setShowAddModal(false);
      setNewTitle("");
      setNewDesc("");
      setNewDue("");
      refreshData();
      
      // Auto select the new deadline
      handleReviewAction(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Voice parse
  const handleVoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceInput) return;

    setIsVoiceProcessing(true);
    try {
      const res = await fetch("/api/agent/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: voiceInput })
      });
      const data = await res.json();
      setVoiceInput("");
      setIsVoiceProcessing(false);
      refreshData();
      if (data.deadline) {
        setParsedVoiceResult(data.deadline);
        showToast("✨ Voice intent captured and parsed successfully!");
      }
    } catch (err) {
      setIsVoiceProcessing(false);
      showToast("❌ Voice submission processing failed.");
    }
  };

  const toggleRecording = () => {
    if (!recognition) {
      // Support simulation fallback or inform user
      runSimulatedVoice();
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      try {
        setVoiceInput("");
        recognition.start();
        setIsRecording(true);
        showToast("🎙️ Listening... Speak now!");
      } catch (err) {
        console.error(err);
        setIsRecording(false);
      }
    }
  };

  const runSimulatedVoice = () => {
    const examples = [
      "File my homework assignment before tomorrow evening and email support",
      "Draft a crisis response for my Chemistry lab writeup that is overdue",
      "Reschedule Priya progress sync to next Thursday 3 PM",
      "Create draft for CS301 Architecture Report due next Tuesday noon"
    ];
    const phrase = examples[Math.floor(Math.random() * examples.length)];
    setIsRecording(true);
    setVoiceInput("");
    let currentText = "";
    let i = 0;
    
    showToast("✨ Simulating voice dictate typing...");
    const interval = setInterval(() => {
      if (i < phrase.length) {
        currentText += phrase[i];
        setVoiceInput(currentText);
        i++;
      } else {
        clearInterval(interval);
        setIsRecording(false);
        showToast("✅ Dictate complete! Press Submit.");
      }
    }, 40);
  };

  // Connections Toggle
  const handleToggleConnection = (id: string) => {
    setConnections(connections.map(c => 
      c.id === id ? { ...c, connected: !c.connected, email: !c.connected ? "arjun.mehta@university.edu" : undefined } : c
    ));
  };

  const handleProfileCapsuleClick = () => {
    setActiveTab('settings');
    showToast("⚙️ Chief Identity active: " + preferences.name);
    setTimeout(() => {
      const input = document.getElementById("profile-name-input") as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 150);
  };

  const handleTriggerSimulationCrisis = async () => {
    try {
      const pastDate = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45m ago
      const mockCrises = [
        {
          title: "Physics 201 Midterm Report",
          description: "Overdue lab manuscript requiring prompt late authorization draft. Instructor rules state 24h grace window with 10% penalty.",
          dueAt: pastDate,
          source: "manual",
          contactName: "Prof. Evelyn Vance",
          contactEmail: "evance@university.edu",
          category: "academics"
        },
        {
          title: "Enterprise Architecture Deployment Proposal",
          description: "Overdue infrastructure design draft. Client requires SLA compliance draft or formal mitigation request.",
          dueAt: pastDate,
          source: "manual",
          contactName: "Director Ronald Croft",
          contactEmail: "rcroft@corporation.com",
          category: "work"
        }
      ];
      
      const chosen = mockCrises[Math.floor(Math.random() * mockCrises.length)];
      
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chosen)
      });
      if (res.ok) {
        showToast("🚨 SLA BREACH SIMULATED: ACTO autonomous recovery protocol engaged!");
        refreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Chart data
  const chartData = [
    { name: "Mon", met: 3, missed: 0 },
    { name: "Tue", met: 4, missed: 1 },
    { name: "Wed", met: 6, missed: 0 },
    { name: "Thu", met: 2, missed: 0 },
    { name: "Fri", met: 5, missed: 1 },
    { name: "Sat", met: 3, missed: 0 },
    { name: "Sun", met: 1, missed: 0 }
  ];

  const categoryBreakdown = [
    { name: "Study", value: 8, color: "#7C5CFC" },
    { name: "Work", value: 12, color: "#14F1D9" },
    { name: "Personal", value: 4, color: "#F59E0B" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 110, 
        damping: 14 
      } 
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#F1F0FF] flex flex-col md:flex-row font-sans overflow-hidden selection:bg-[#7C5CFC]/30 bg-grid-blueprint relative">
      
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
      <div className="custom-orb left-1/4 top-1/4 -translate-x-1/2 pointer-events-none z-0" />
      <div className="custom-orb right-1/4 bottom-1/4 translate-x-1/2 pointer-events-none z-0 opacity-40 animate-[pulse_6s_infinite]" />

      {/* High-Density Side Menu */}
      <aside className="w-full md:w-60 bg-[#0E0E15]/95 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/5 p-4 flex flex-col justify-between shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.15)]">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-1">
            <div 
              className="flex items-center gap-2 text-lg font-display font-bold tracking-tight select-none cursor-pointer shrink-0" 
              onClick={() => navigate("/")} 
              title="Go to Home"
            >
              <motion.div 
                whileHover={{ scale: 1.1, rotate: 10 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C5CFC] to-[#14F1D9] flex items-center justify-center text-[#0A0A0F] text-xs font-bold shadow-[0_0_10px_rgba(124,92,252,0.4)] shrink-0"
              >
                ⚡
              </motion.div>
              <span className="acto-logo-text bg-clip-text text-transparent bg-gradient-to-r from-white to-[#E4E4E7]">
                ACTO
              </span>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#14F1D9] hover:text-white border border-[#14F1D9]/20 hover:border-[#14F1D9]/50 rounded-lg bg-[#14F1D9]/5 hover:bg-[#14F1D9]/15 transition-all duration-200 cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Return to Landing Page"
            >
              <span>🏡</span>
              <span>Home</span>
            </button>
          </div>

          <nav className="space-y-1">
            {[
              { id: "feed", label: "Action Feed", emoji: "⚡" },
              { id: "recovery", label: "Recovery Center", emoji: "🚨" },
              { id: "voice", label: "Voice Control", emoji: "🎙️" },
              { id: "analytics", label: "Analytics Board", emoji: "📈" },
              { id: "settings", label: "Settings", emoji: "⚙️" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                  activeTab === tab.id
                    ? "bg-[#7C5CFC]/15 text-[#A78BFA] border-l-2 border-[#7C5CFC]"
                    : "text-[#9CA3AF] hover:text-[#F1F0FF] hover:bg-white/[0.02]"
                }`}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {tab.id === "recovery" && deadlines.some(d => d.status === "missed") && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* User Info Capsule */}
        <div 
          onClick={handleProfileCapsuleClick}
          className="pt-4 border-t border-white/5 flex items-center gap-2.5 cursor-pointer hover:bg-white/[0.04] p-1.5 rounded-xl transition-all duration-200 group border border-transparent hover:border-white/5 active:scale-95"
          title="Edit Profile Configuration (Arjun Mehta)"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] flex items-center justify-center font-bold text-xs text-[#0A0A0F] shadow-[0_0_10px_rgba(124,92,252,0.2)] group-hover:shadow-[0_0_15px_rgba(20,241,217,0.4)] transition-all duration-200">
            {preferences.name ? preferences.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : "AM"}
          </div>
          <div className="text-left overflow-hidden flex-1">
            <div className="text-xs font-semibold truncate text-[#F1F0FF] group-hover:text-[#14F1D9] transition-colors duration-200">
              {preferences.name}
            </div>
            <div className="text-[10px] text-[#9CA3AF] truncate">{preferences.email}</div>
          </div>
          <span className="text-[10px] text-[#9CA3AF]/60 group-hover:text-white transition-colors">⚙️</span>
        </div>
      </aside>

      {/* Main High-Density Workspace */}
      <main className="flex-1 flex flex-col min-h-0 bg-transparent relative z-10">
        
        {/* Top Mini Control Header */}
        <header className="flex justify-between items-center px-6 py-3 border-b border-white/5 bg-[#0E0E15]/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-white uppercase font-mono">
              {activeTab === 'feed' && "Command Feed"}
              {activeTab === 'recovery' && "Recovery Matrix"}
              {activeTab === 'voice' && "Voice Grounding Parser"}
              {activeTab === 'analytics' && "Analytics Workspace"}
              {activeTab === 'settings' && "System Preferences"}
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14F1D9] animate-ping" />
              <span className="text-[10px] text-[#9CA3AF] font-mono">System Live</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-xs transition-colors duration-200 cursor-pointer"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>

            {activeTab === 'feed' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-[#7C5CFC]/20 hover:bg-[#7C5CFC]/30 text-[#A78BFA] border border-[#7C5CFC]/30 rounded-lg text-[11px] font-bold transition-all transform active:scale-95 flex items-center gap-1"
              >
                <span>➕</span> Create Deadline Target
              </button>
            )}
          </div>
        </header>

        {/* FEED: High Density Tri-pane Layout */}
        {activeTab === 'feed' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5">
            
            {/* PANE 1: Compact Master Deadline List (lg:col-span-4) */}
            <div className="lg:col-span-4 flex flex-col min-h-0 bg-[#0D0D14]/30 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-[10px] font-mono uppercase text-[#9CA3AF] tracking-wider">Deadlines Feed ({deadlines.length})</span>
                <span className="text-[10px] text-[#14F1D9] font-mono">Sorted by Urgency</span>
              </div>

              {/* Critical Threat Pulse/Glow Banner */}
              {deadlines.some(d => d.urgencyScore > 85 && d.status === 'active') && (
                <motion.div
                  animate={{
                    boxShadow: [
                      "0 0 4px rgba(239, 68, 68, 0.2)",
                      "0 0 16px rgba(239, 68, 68, 0.4)",
                      "0 0 4px rgba(239, 68, 68, 0.2)"
                    ],
                    borderColor: [
                      "rgba(239, 68, 68, 0.3)",
                      "rgba(239, 68, 68, 0.6)",
                      "rgba(239, 68, 68, 0.3)"
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="p-3 rounded-xl bg-gradient-to-r from-[#EF4444]/10 to-transparent border border-[#EF4444]/30 text-left flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm animate-pulse">🚨</span>
                    <div>
                      <div className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">CRITICAL ACTIONS REQUIRED</div>
                      <div className="text-[11px] text-[#9CA3AF]">Imperative deadlines require immediate autonomous response.</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase animate-pulse">
                    Threat: High
                  </span>
                </motion.div>
              )}

              {deadlines.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted">
                  <span className="text-2xl mb-2">⭐</span>
                  <div className="text-xs font-semibold">Feed completely clean.</div>
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  {deadlines.map((dl) => {
                    const minutesLeft = Math.round((new Date(dl.dueAt).getTime() - Date.now()) / (1000 * 60));
                    const isPastDue = minutesLeft < 0;
                    const isSelected = selectedDeadline?.id === dl.id;

                    return (
                      <motion.div
                        key={dl.id}
                        layout
                        variants={cardVariants}
                        onClick={() => handleReviewAction(dl)}
                        whileHover={{ scale: 1.01, x: 2, borderColor: "rgba(124, 92, 252, 0.5)" }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 relative overflow-hidden ${
                          isSelected
                            ? "bg-[#7C5CFC]/15 border-[#7C5CFC] shadow-lg shadow-[#7C5CFC]/10"
                            : dl.status === 'done' || dl.status === 'recovered'
                            ? "bg-white/[0.01] border-white/5 opacity-40"
                            : "bg-[#0E0E15]/85 border-white/10 hover:border-white/20 hover:bg-[#12121B]"
                        }`}
                      >
                        {/* Selected Indicator strip */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#7C5CFC]" />
                        )}

                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="text-sm font-extrabold text-white font-display tracking-tight leading-snug flex items-center gap-1.5">
                            <span className="text-sm">{dl.source === 'gmail' ? '📧' : dl.source === 'calendar' ? '📅' : dl.source === 'tasks' ? '✅' : '📝'}</span>
                            <span>{dl.title}</span>
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 uppercase tracking-wider ${
                            dl.status === 'done' || dl.status === 'recovered'
                              ? "bg-white/10 text-[#9CA3AF]"
                              : dl.urgencyScore > 85
                              ? "bg-[#EF4444]/25 text-[#FF6B6B]"
                              : "bg-[#7C5CFC]/25 text-[#C084FC]"
                          }`}>
                            {dl.category}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-[#9CA3AF] line-clamp-2 mb-3 leading-relaxed">
                          {dl.description}
                        </p>

                        <div className="flex items-center justify-between gap-2 text-xs font-mono text-[#D1D5DB] pt-2 border-t border-white/5">
                          <span className="truncate max-w-[140px] font-medium">
                            👤 {dl.contactName}
                          </span>
                          <span className={`shrink-0 font-extrabold tracking-wide ${isPastDue ? "text-[#FF6B6B]" : "text-[#14F1D9]"}`}>
                            {isPastDue ? "⚠️ OVERDUE" : `⌛ ${minutesLeft}m left`}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </div>

            {/* PANE 2: Inline Active Suggestion Editor (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#0A0A0F] overflow-y-auto p-4">
              {selectedDeadline ? (
                <div className="space-y-4">
                  {/* Selected Item header */}
                  <div className="pb-3 border-b border-white/5 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">Currently Selected Target</span>
                      <h3 className="text-base font-bold font-display text-white">{selectedDeadline.title}</h3>
                    </div>
                    <span className="text-[10px] text-[#14F1D9] bg-[#14F1D9]/10 px-2 py-0.5 rounded font-mono shrink-0">
                      Score: {selectedDeadline.urgencyScore}%
                    </span>
                  </div>

                  {/* SELECT AGENTIC PLAYBOOK STRATEGY */}
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold text-[#9CA3AF] uppercase tracking-wider block">
                        Select Agentic Playbook Strategy
                      </label>
                      <span className="text-[9px] font-mono font-bold bg-[#14F1D9]/10 text-[#14F1D9] px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">
                        ⚡ Live Tactics
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "negotiate", label: "🕒 Negotiator" },
                        { id: "shield", label: "📅 Shield Block" },
                        { id: "outline", label: "🚀 Attack Plan" },
                        { id: "coworking", label: "🤝 Co-Working" }
                      ].map((p) => {
                        const isPlaybookActive = activePlaybook === p.id;
                        return (
                          <button
                            key={p.id}
                            disabled={isSuggesting || selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered'}
                            onClick={() => handleReviewAction(selectedDeadline, p.id)}
                            className={`py-2 px-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                              isPlaybookActive
                                ? "bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] text-[#0A0A0F] border-transparent shadow-lg shadow-[#7C5CFC]/20"
                                : "bg-[#0E0E15] hover:bg-[#12121B] text-white border-white/10 hover:border-white/20"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Loading CoT trace if analyzing */}
                  {isSuggesting ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-4">
                      <div className="w-10 h-10 rounded-full border-t-2 border-[#7C5CFC] animate-spin flex items-center justify-center">
                        <span className="text-xs text-[#7C5CFC]">⚡</span>
                      </div>
                      <div className="space-y-1.5 text-center">
                        <div className="text-xs font-mono text-[#9CA3AF]">Deploying targeted {activePlaybook} strategy playbook...</div>
                        <div className="text-[11px] font-mono text-[#7C5CFC] max-w-xs mx-auto animate-pulse">
                          {cotIndex === 0 && "🔍 Analyzing email threads & sync frequency..."}
                          {cotIndex === 1 && "🧠 Verifying late assignment credit policies..."}
                          {cotIndex >= 2 && "✍️ Compiling tone-matched apologetic draft..."}
                        </div>
                      </div>
                    </div>
                  ) : currentAction ? (
                    <div className="space-y-5">
                      {/* Reasoning bar */}
                      <motion.div 
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="p-4 rounded-xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-xs text-[#A78BFA] leading-relaxed flex gap-2.5 shadow-md"
                      >
                        <span className="shrink-0 text-base">🤖</span>
                        <div>
                          <strong className="text-white font-bold">Agent Reasoning:</strong> {currentAction.agentReasoning}
                        </div>
                      </motion.div>

                      {/* Recipient info & Subject */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold font-mono text-[#9CA3AF] uppercase tracking-wider block">Recipient Contact</label>
                          <div className="px-3.5 py-2.5 rounded-lg bg-[#0E0E15]/90 border border-white/10 text-xs text-white font-semibold font-mono truncate">
                            {currentAction.draftTo || "N/A"}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold font-mono text-[#9CA3AF] uppercase tracking-wider block">Action Channel</label>
                          <div className="px-3.5 py-2.5 rounded-lg bg-[#14F1D9]/10 border border-[#14F1D9]/20 text-xs text-[#14F1D9] font-semibold font-mono uppercase tracking-wider">
                            {activePlaybook === "negotiate" && "📧 Google Mail Draft"}
                            {activePlaybook === "shield" && "📅 Calendar focus Block"}
                            {activePlaybook === "outline" && "🚀 Action Step Planner"}
                            {activePlaybook === "coworking" && "💬 WhatsApp Outreach"}
                          </div>
                        </div>
                      </div>

                      {/* INTERACTIVE PLAYBOOK DISPLAY UPGRADES */}
                      {activePlaybook === "shield" && (
                        <div className="p-4 rounded-xl bg-[#0F172A]/80 border border-[#3B82F6]/30 space-y-3 relative overflow-hidden text-left shadow-lg">
                          <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#3B82F6]/20 text-[#60A5FA] text-[8px] font-mono rounded-bl font-bold uppercase tracking-wider">
                            Google Workspace Sync
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">📅</span>
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-white uppercase tracking-wider font-display">
                                Google Calendar focus block ready
                              </div>
                              <div className="text-[11px] text-[#9CA3AF] leading-relaxed">
                                ACTO can write this focus protection slot directly into your main calendar.
                              </div>
                            </div>
                          </div>
                          
                          {isCalendarScheduled ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg text-center"
                            >
                              <span className="text-[11px] font-bold text-[#34D399] font-mono">
                                ✓ FOCUS BLOCK SUCCESSFULLY INJECTED TO CALENDAR
                              </span>
                            </motion.div>
                          ) : (
                            <button
                              onClick={async () => {
                                setIsSchedulingCalendar(true);
                                setTimeout(() => {
                                  setIsSchedulingCalendar(false);
                                  setIsCalendarScheduled(true);
                                  triggerConfetti();
                                  showToast("📅 focus Block Inserted to Google Calendar!");
                                  setLogs(prev => [
                                    { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), desc: `[CALENDAR] Auto-scheduled 2-hour Shield Block for: "${editedSubject}"` },
                                    ...prev
                                  ]);
                                }, 1200);
                              }}
                              disabled={isSchedulingCalendar}
                              className="w-full py-2 bg-gradient-to-r from-[#3B82F6] to-[#7C5CFC] hover:from-[#60A5FA] hover:to-[#A78BFA] text-white rounded-xl text-xs font-bold transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-1.5 shadow-md border border-white/15 cursor-pointer"
                            >
                              {isSchedulingCalendar ? (
                                <>
                                  <span className="w-3.5 h-3.5 border-t-2 border-white rounded-full animate-spin inline-block mr-1" />
                                  Syncing with Google Calendar...
                                </>
                              ) : (
                                <>
                                  <span>⚡</span> AUTO-SCHEDULE FOCUS SHIELD
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {activePlaybook === "outline" && (
                        <div className="p-4 rounded-xl bg-[#0D0D14] border border-[#14F1D9]/20 space-y-3.5 text-left shadow-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono font-bold text-[#14F1D9] uppercase tracking-wider">
                              Interactive Goal Progress Tracker
                            </span>
                            <span className="text-[10px] text-[#9CA3AF] font-mono">
                              {Object.values(outlineCompletedSteps).filter(Boolean).length} of 3 complete
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {[
                              { id: "step1", label: "Milestone 1: Resolve Core Pathways and Compile Check" },
                              { id: "step2", label: "Milestone 2: Structure Assembly & Packaging Verification" },
                              { id: "step3", label: "Milestone 3: PDF Packaging & Deliverable Submission" }
                            ].map((step) => {
                              const isDone = !!outlineCompletedSteps[step.id];
                              return (
                                <div
                                  key={step.id}
                                  onClick={() => {
                                    setOutlineCompletedSteps(prev => ({
                                      ...prev,
                                      [step.id]: !prev[step.id]
                                    }));
                                    if (!isDone) {
                                      showToast(`🎯 Task accomplished!`);
                                    }
                                  }}
                                  className={`p-3 rounded-lg border text-xs font-bold flex items-center gap-3 cursor-pointer transition-all ${
                                    isDone
                                      ? "bg-[#14F1D9]/10 border-[#14F1D9]/30 text-[#14F1D9]/90 line-through"
                                      : "bg-[#0E0E15] hover:bg-[#12121B] border-white/5 text-white"
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                    isDone ? "bg-[#14F1D9] border-[#14F1D9] text-[#0A0A0F]" : "border-white/30"
                                  }`}>
                                    {isDone && "✓"}
                                  </div>
                                  <span>{step.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold font-mono text-[#9CA3AF] uppercase tracking-wider block">
                          {activePlaybook === "shield" ? "Calendar Block Agenda Text" : activePlaybook === "outline" ? "Execution Milestone details" : "Action Subject line"}
                        </label>
                        <input
                          type="text"
                          value={editedSubject}
                          onChange={(e) => setEditedSubject(e.target.value)}
                          disabled={selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered'}
                          className={`w-full px-4 py-3 rounded-xl border text-xs font-bold focus:outline-none transition-colors focus:ring-1 ${
                            selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered'
                              ? "bg-white/[0.01] border-white/5 text-[#9CA3AF] cursor-not-allowed"
                              : "bg-[#0E0E15] border-white/10 text-white focus:border-[#7C5CFC] focus:ring-[#7C5CFC]"
                          }`}
                          placeholder="Email Subject Line..."
                        />
                      </div>

                      {/* Body draft snippet - fully editable textarea! */}
                      <div className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold font-mono text-[#9CA3AF] uppercase tracking-wider block">
                            {activePlaybook === "outline" || activePlaybook === "shield" ? "Generated Protocol Guidelines" : "AI Generated Draft Body"}
                          </label>
                          <span className={`text-[10px] font-mono font-bold ${
                            selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered'
                              ? "text-[#14F1D9] uppercase tracking-wider"
                              : "text-[#7C5CFC]"
                          }`}>
                            {selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered'
                              ? "🔒 Dispatched & Archived in Ledger"
                              : "✓ Live Editable"}
                          </span>
                        </div>
                        <div className="relative group">
                          <textarea
                            value={editedBody}
                            onChange={(e) => setEditedBody(e.target.value)}
                            disabled={selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered'}
                            className={`w-full p-4 rounded-xl text-xs font-mono font-medium leading-relaxed shadow-inner focus:outline-none focus:ring-1 ${
                              selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered'
                                ? "bg-white/[0.01] border-white/5 text-[#9CA3AF] cursor-not-allowed"
                                : "bg-[#0E0E15]/95 border-[#7C5CFC]/30 text-[#F1F0FF] focus:border-[#14F1D9] focus:ring-[#14F1D9]"
                            }`}
                            rows={8}
                            placeholder="Draft body content..."
                          />
                          <div className="absolute right-3 bottom-3 text-[10px] text-[#14F1D9]/70 bg-[#14F1D9]/5 px-2 py-0.5 rounded border border-[#14F1D9]/10 font-mono">
                            Tone: {preferences.aiTone}
                          </div>
                        </div>
                      </div>

                      {/* CoT trace */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-xs font-bold font-mono text-[#9CA3AF] uppercase tracking-wider block">Agent Intelligence Trace</label>
                        <div className="space-y-1.5 bg-white/[0.01] p-3.5 rounded-xl border border-white/5 font-mono text-[10px] text-[#9CA3AF]">
                          {currentAction.chainOfThought?.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[#14F1D9] shrink-0">✓</span>
                              <span className="text-white font-medium">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Execution CTAs or Completed Banner */}
                      {selectedDeadline.status === 'done' || selectedDeadline.status === 'recovered' ? (
                        <div className="p-4 rounded-xl bg-[#14F1D9]/5 border border-[#14F1D9]/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg relative overflow-hidden text-left">
                          <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#14F1D9]/15 text-[#14F1D9] text-[8px] font-mono rounded-bl font-bold uppercase tracking-wider border-l border-b border-[#14F1D9]/20">
                            Archived Ledger
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🚀</span>
                            <div>
                              <div className="text-xs font-black text-white uppercase tracking-wider font-display">
                                Action Dispatched Successfully
                              </div>
                              <div className="text-[10px] text-[#14F1D9] font-mono font-bold">
                                ACTO Autonomous execution cycle complete.
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] bg-[#14F1D9]/15 text-[#14F1D9] font-mono px-3 py-1 rounded font-black uppercase tracking-wider shrink-0 border border-[#14F1D9]/20">
                            Status: DISPATCHED ✅
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                          <button
                            onClick={() => handleRejectAction(currentAction.id)}
                            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all transform active:scale-95 border border-red-500/20 cursor-pointer"
                          >
                            Reject Suggestion ✕
                          </button>
                          <button
                            onClick={() => {
                              setIsReviewModalOpen(true);
                            }}
                            className="px-6 py-3 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] hover:from-[#A78BFA] hover:to-[#14F1D9] text-[#0A0A0F] rounded-xl text-xs font-black transition-all transform hover:scale-[1.02] active:scale-[0.97] flex items-center gap-1.5 shadow-lg shadow-[#7C5CFC]/20 border border-white/10 cursor-pointer"
                          >
                            <span>⚡</span> REVIEW & APPROVE
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-[#9CA3AF] space-y-2">
                      <span className="text-3xl">🤖</span>
                      <p className="text-xs">Agent suggestion ready for evaluation.</p>
                      <button
                        onClick={() => handleReviewAction(selectedDeadline)}
                        className="px-4 py-2 bg-[#7C5CFC]/20 text-[#A78BFA] border border-[#7C5CFC]/30 rounded-lg text-xs font-semibold"
                      >
                        Recalculate Intent
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted">
                  <span className="text-4xl mb-4">🎯</span>
                  <h4 className="text-sm font-semibold text-white">Select a Target from Feed</h4>
                  <p className="text-xs text-[#9CA3AF] max-w-xs mt-1">
                    Select any impending deadline to display immediate agent reasoning, communication tone alignment, and draft outputs here.
                  </p>
                </div>
              )}
            </div>

            {/* PANE 3: Compact Side widgets: Mini-Charts & Live Connections (lg:col-span-3) */}
            <div className="lg:col-span-3 flex flex-col min-h-0 bg-[#0E0E15]/40 overflow-y-auto p-4 space-y-5">
              
              {/* Connected Status Modules */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono uppercase text-[#9CA3AF] tracking-wider block text-left">Connected Channels</span>
                <div className="grid grid-cols-3 gap-2">
                  {connections.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleToggleConnection(c.id)}
                      className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                        c.connected
                          ? "bg-[#7C5CFC]/10 border-[#7C5CFC]/30 text-white"
                          : "bg-white/[0.01] border-white/5 text-[#4B5563]"
                      }`}
                    >
                      <div className="text-sm mb-0.5">{c.icon}</div>
                      <div className="text-[9px] font-semibold tracking-wide font-mono uppercase">
                        {c.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AGENT INTELLIGENCE RECOMMENDATIONS */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#7C5CFC]/15 to-[#14F1D9]/5 border border-[#7C5CFC]/25 text-left space-y-2.5 shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">💡</span>
                  <span className="text-[10px] font-mono uppercase text-[#14F1D9] tracking-wider font-extrabold">
                    Agent Intelligence Advise
                  </span>
                </div>
                <div className="space-y-2 text-[11px] text-[#D1D5DB] leading-relaxed">
                  {selectedDeadline ? (
                    <>
                      <div className="p-2.5 bg-[#0A0A0F]/50 rounded-lg border border-white/5 space-y-1">
                        <strong className="text-white text-[11px] block">📌 Active Channel Analysis</strong>
                        <span className="text-gray-300">
                          Recipient <span className="text-[#A78BFA] font-mono font-bold">{selectedDeadline.contactName}</span> typically signs off and reacts to concise, highly actionable briefs. Keep explanation short.
                        </span>
                      </div>
                      <div className="p-2.5 bg-[#0A0A0F]/50 rounded-lg border border-white/5 space-y-1">
                        <strong className="text-white text-[11px] block">🔥 Optimal Action Timing</strong>
                        <span className="text-gray-300">
                          Based on historic interaction matrices, dispatching this between <span className="text-[#14F1D9] font-mono font-bold">9 AM and 11 AM</span> increases immediate approval rate by <span className="text-[#14F1D9] font-mono">43%</span>.
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-[#9CA3AF] text-[10px] leading-normal py-1">
                      Select an impending target deadline from your active feed to populate real-time context recommendations.
                    </p>
                  )}
                </div>
              </div>

              {/* Mini analytics charts */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <span className="text-[10px] font-mono uppercase text-[#9CA3AF] tracking-wider block text-left">Met vs Missed Ratio</span>
                <div className="h-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" stroke="#4B5563" fontSize={8} tickLine={false} />
                      <Tooltip cursor={false} contentStyle={{ backgroundColor: "#0E0E15", border: "1px solid rgba(255,255,255,0.05)", fontSize: 10 }} />
                      <Bar dataKey="met" stackId="a" fill="#14F1D9" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dynamic activity terminal log widget */}
              <div className="p-3 rounded-xl bg-[#07070B] border border-white/5 flex-1 flex flex-col min-h-[160px]">
                <span className="text-[10px] font-mono uppercase text-[#9CA3AF] tracking-wider block text-left mb-2">Live Execution Log</span>
                <div className="flex-1 overflow-y-auto space-y-2 text-left pr-1 scrollbar-thin">
                  {logs.map((log, lIdx) => (
                    <motion.div
                      key={lIdx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: lIdx * 0.12, duration: 0.3 }}
                      className="text-[9px] font-mono text-[#9CA3AF] leading-relaxed flex items-start gap-1.5"
                    >
                      <span className="text-[#7C5CFC] font-semibold shrink-0">[{log.time}]</span>
                      <span className="text-[#14F1D9] shrink-0">$&gt;</span>
                      <span className="flex-1 break-words">{log.desc}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* RECOVERY CENTER TAB */}
        {activeTab === 'recovery' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
            {/* Header Protocol Console */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-[#EF4444]/15 to-[#EF4444]/5 border border-[#EF4444]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                  <span className="animate-pulse">🚨</span> Recovery Protocol Core (SLA Mitigation)
                </h3>
                <p className="text-xs text-[#9CA3AF] max-w-xl leading-relaxed">
                  Autonomous self-healing protocols activate instantly when portals register expired deadlines. ACTO parses the instructor's syllabus policies and drafts late-authorization appeals automatically.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(239, 68, 68, 0.4)" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleTriggerSimulationCrisis}
                className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold font-mono rounded-lg shadow-md flex items-center gap-2 cursor-pointer transition-all border border-red-400/20"
              >
                <span>⚠️</span> SIMULATE OVERDUE SLA BREACH
              </motion.button>
            </div>

            {/* Crisis Level Meter & Self-Healing Telemetry */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#0E0E15] border border-white/5 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider block">Crisis Level Status</span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={`text-2xl font-bold font-mono ${deadlines.filter(d => d.status === 'missed').length > 0 ? "text-red-500" : "text-[#14F1D9]"}`}>
                      {deadlines.filter(d => d.status === 'missed').length === 0 ? "0%" : deadlines.filter(d => d.status === 'missed').length === 1 ? "50%" : "100%"}
                    </span>
                    <span className="text-xs text-[#9CA3AF]">
                      {deadlines.filter(d => d.status === 'missed').length === 0 ? "Averted" : deadlines.filter(d => d.status === 'missed').length === 1 ? "Moderate Stress" : "CRITICAL BREACH"}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full transition-all duration-500 ${deadlines.filter(d => d.status === 'missed').length > 0 ? "bg-red-500" : "bg-[#14F1D9]"}`} 
                    style={{ width: deadlines.filter(d => d.status === 'missed').length === 0 ? "5%" : deadlines.filter(d => d.status === 'missed').length === 1 ? "50%" : "100%" }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0E0E15] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider block">Syllabus NLP Parser Kernel</span>
                <div className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#14F1D9] shrink-0" />
                  High-Fidelity Context Analyzer
                </div>
                <p className="text-[10px] text-[#9CA3AF] leading-snug">Extracts grading curves & late submission policy clauses instantly.</p>
              </div>

              <div className="p-4 rounded-xl bg-[#0E0E15] border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-[#9CA3AF] uppercase tracking-wider block">Email Defense Channel</span>
                <div className="text-xs font-semibold text-white mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#14F1D9] shrink-0" />
                  SMTP Relay Connection
                </div>
                <p className="text-[10px] text-[#9CA3AF] leading-snug">Ready to dispatch optimized drafts to partners or instructors.</p>
              </div>
            </div>

            {/* Crises Grid */}
            {deadlines.filter(d => d.status === 'missed').length === 0 ? (
              <div className="p-16 rounded-2xl bg-white/[0.01] border border-white/5 text-center flex flex-col items-center justify-center space-y-3">
                <span className="text-4xl">🛡️</span>
                <h4 className="text-sm font-bold font-display text-white">All crises fully averted.</h4>
                <p className="text-xs text-[#9CA3AF] max-w-sm leading-relaxed">
                  Excellent work. No deadlines are currently overdue. Click <strong className="text-red-400">Simulate Overdue SLA Breach</strong> above to test ACTO's immediate crisis self-healing behavior!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-bold font-mono text-[#EF4444] uppercase tracking-wider">Active Breaches Under Mitigation</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deadlines.filter(d => d.status === 'missed').map((dl) => (
                    <div key={dl.id} className="p-5 rounded-xl bg-[#0E0E15]/95 border border-red-500/20 flex flex-col justify-between gap-5 shadow-lg relative overflow-hidden group hover:border-red-500/30 transition-all duration-200">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#EF4444]/5 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] uppercase tracking-wider font-mono">
                            SLA BREACH ALERT
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] font-mono">
                            Missed: {Math.round((Date.now() - new Date(dl.dueAt).getTime()) / (1000 * 60))}m ago
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold font-display text-white group-hover:text-red-400 transition-colors">{dl.title}</h4>
                          <p className="text-xs text-[#9CA3AF] mt-1.5 leading-relaxed">{dl.description}</p>
                        </div>
                        
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[#9CA3AF]">Contact Target:</span>
                            <span className="text-white">{dl.contactName} ({dl.contactEmail})</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-[#9CA3AF]">Resolution Status:</span>
                            <span className="text-amber-400 animate-pulse font-bold">Draft Generated / Review Required</span>
                          </div>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setActiveTab("feed");
                          handleReviewAction(dl);
                        }}
                        className="w-full py-3 bg-[#EF4444] hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <span>🛡️</span> DEFEND & DISPATCH MITIGATION PLAN
                      </motion.button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VOICE CONTROL TAB */}
        {activeTab === 'voice' && (
          <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="w-full max-w-xl p-8 rounded-2xl bg-[#0E0E15]/85 backdrop-blur-xl border border-white/5 text-center space-y-6 shadow-2xl relative overflow-hidden">
              {/* Background gradient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#7C5CFC]/10 rounded-full blur-3xl pointer-events-none" />

              {/* Speech Microphone trigger */}
              <div className="relative flex flex-col items-center justify-center py-4">
                <motion.button
                  type="button"
                  onClick={toggleRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-lg cursor-pointer transition-all duration-300 relative ${
                    isRecording 
                      ? 'bg-gradient-to-r from-[#EF4444] to-[#7C5CFC] shadow-[0_0_25px_rgba(239,68,68,0.5)]' 
                      : 'bg-gradient-to-br from-[#7C5CFC]/20 to-[#14F1D9]/20 hover:from-[#7C5CFC]/30 hover:to-[#14F1D9]/30 border border-white/10 shadow-[0_0_15px_rgba(124,92,252,0.15)]'
                  }`}
                  title={isRecording ? "Stop Recording" : "Start Recording"}
                >
                  {isRecording ? (
                    <>
                      {/* Pulse rings */}
                      <span className="absolute inset-0 rounded-full bg-[#EF4444]/30 animate-ping" />
                      <span className="absolute -inset-2 rounded-full border border-[#EF4444]/20 animate-pulse" />
                      <span>⏹️</span>
                    </>
                  ) : (
                    <span>🎙️</span>
                  )}
                </motion.button>

                <div className="mt-4 space-y-1">
                  <h4 className="text-sm font-bold font-display text-white">
                    {isRecording ? "Listening... Speak now" : "Tap the Mic to Speak"}
                  </h4>
                  <p className="text-[10px] text-[#9CA3AF] font-mono">
                    {isRecording ? "Transcribing voice in real-time" : "Uses browser Web Speech API"}
                  </p>
                </div>

                {/* Pulsing Visual Waveform */}
                {isRecording && (
                  <div className="flex items-center gap-1 mt-3 justify-center h-4">
                    {[0.6, 1.2, 0.8, 1.5, 0.5, 1.1, 0.7].map((delay, i) => (
                      <motion.span
                        key={i}
                        animate={{ height: ["4px", "16px", "4px"] }}
                        transition={{ duration: delay, repeat: Infinity, ease: "easeInOut" }}
                        className="w-1 bg-[#14F1D9] rounded-full"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold font-display text-white">Gemini Voice Core</h3>
                <p className="text-xs text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                  Instruct ACTO using natural voice commands. Your live speech is instantly converted to text and parsed using autonomous directives.
                </p>
              </div>

              <form onSubmit={handleVoiceSubmit} className="space-y-4 text-left">
                <div className="relative">
                  <input
                    type="text"
                    value={voiceInput}
                    onChange={(e) => setVoiceInput(e.target.value)}
                    placeholder="Speak now, or type: e.g. Reschedule sync with Priya to tomorrow noon..."
                    className="w-full pl-4 pr-12 py-4 rounded-xl bg-[#0A0A0F]/90 border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C5CFC] transition-all duration-200"
                  />
                  {voiceInput && (
                    <button
                      type="button"
                      onClick={() => setVoiceInput("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-white"
                      title="Clear text"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={runSimulatedVoice}
                    className="flex-1 py-3 border border-[#7C5CFC]/20 hover:border-[#7C5CFC]/50 text-white hover:text-[#14F1D9] text-xs font-semibold rounded-xl bg-[#7C5CFC]/5 hover:bg-[#7C5CFC]/15 transition-all duration-200 active:scale-95 cursor-pointer"
                  >
                    ✨ Simulate Voice
                  </button>

                  <button
                    type="submit"
                    disabled={isVoiceProcessing || !voiceInput}
                    className="flex-[2] py-3 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] hover:from-[#A78BFA] hover:to-[#14F1D9] text-[#0A0A0F] text-xs font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95 cursor-pointer shadow-[0_4px_12px_rgba(124,92,252,0.2)] disabled:pointer-events-none"
                  >
                    {isVoiceProcessing ? "Parsing utterance directives..." : "Submit Intent Directive ✨"}
                  </button>
                </div>
              </form>

              {parsedVoiceResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-5 rounded-xl bg-white/[0.03] border border-[#7C5CFC]/30 text-left space-y-4 relative z-10"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-xs font-bold font-mono text-[#14F1D9] uppercase tracking-wider">⚡ ACTO Voice Parse Accomplished</span>
                    <span className="text-[10px] bg-[#7C5CFC]/25 text-[#C084FC] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                      {parsedVoiceResult.category}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-white">{parsedVoiceResult.title}</h4>
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">{parsedVoiceResult.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#0A0A0F]/60 p-3 rounded-lg border border-white/5">
                    <div>
                      <span className="text-[#9CA3AF] block text-[10px] uppercase">Target Contact</span>
                      <span className="text-white font-bold">{parsedVoiceResult.contactName}</span>
                    </div>
                    <div>
                      <span className="text-[#9CA3AF] block text-[10px] uppercase">Urgency Rating</span>
                      <span className="text-[#FF6B6B] font-extrabold">{parsedVoiceResult.urgencyScore}% Priority</span>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setParsedVoiceResult(null)}
                      className="flex-1 py-2.5 border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                    >
                      🎙️ Submit Another
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReviewAction(parsedVoiceResult);
                        setActiveTab("feed");
                        setParsedVoiceResult(null);
                      }}
                      className="flex-[2] py-2.5 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] hover:from-[#A78BFA] hover:to-[#14F1D9] text-[#0A0A0F] text-xs font-extrabold rounded-xl transition-all cursor-pointer active:scale-95 shadow-[0_4px_15px_rgba(20,241,217,0.25)] flex items-center justify-center gap-1"
                    >
                      <span>🚀</span> Transit to Feed & Execute
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
            {/* Top Stat row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Resolved Tasks", val: "24", emoji: "✓", color: "text-[#14F1D9]" },
                { label: "Time Saved", val: "4.8 hrs", emoji: "⏱️", color: "text-[#7C5CFC]" },
                { label: "Execution Accuracy", val: "94.2%", emoji: "📈", color: "text-[#14F1D9]" },
                { label: "Mitigations Dispatched", val: "6", emoji: "🚨", color: "text-red-400" }
              ].map((m, i) => (
                <div key={i} className="p-4 rounded-xl bg-[#0E0E15] border border-white/10 hover:border-white/20 transition-all shadow-md">
                  <div className="text-xs text-[#9CA3AF] uppercase font-mono tracking-wider font-bold">{m.label}</div>
                  <div className="text-2xl font-black font-display mt-1.5 text-white flex items-center gap-2">
                    <span className={`${m.color} text-lg`}>{m.emoji}</span>
                    {m.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Visual Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Line chart */}
              <div className="p-5 rounded-xl bg-[#0E0E15] border border-white/10 space-y-3 shadow-md">
                <h3 className="text-sm font-black font-display text-white uppercase tracking-wider font-mono">Performance Activity Timeline</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0E0E15", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                      <Area type="monotone" dataKey="met" stroke="#14F1D9" strokeWidth={2.5} fillOpacity={0.15} fill="url(#colorMet)" />
                      <defs>
                        <linearGradient id="colorMet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14F1D9" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#14F1D9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar breakdown */}
              <div className="p-5 rounded-xl bg-[#0E0E15] border border-white/10 space-y-3 shadow-md">
                <h3 className="text-sm font-black font-display text-white uppercase tracking-wider font-mono">Volume Categories</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBreakdown}>
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={10} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#0E0E15", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                      <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bento Grid: Agent Efficiency Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#0E0E15] to-[#7C5CFC]/5 border border-white/10 space-y-2">
                <div className="text-[10px] font-mono font-bold text-[#7C5CFC] uppercase tracking-wider">Communication Quality</div>
                <h4 className="text-lg font-extrabold text-white">98.6% Tone Calibration</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed font-semibold">
                  Every auto-generated draft is evaluated against your personality traits. Active profile matches student/corporate tone flawlessly.
                </p>
                <div className="pt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#14F1D9] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase">Profile matches user style</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-br from-[#0E0E15] to-[#14F1D9]/5 border border-white/10 space-y-2">
                <div className="text-[10px] font-mono font-bold text-[#14F1D9] uppercase tracking-wider">Autonomous Efficiency</div>
                <h4 className="text-lg font-extrabold text-white">Avg 1.8 Min Response</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed font-semibold">
                  ACTO executes strategic actions within minutes of detecting critical deadlines, bypassing procrastination bottlenecks entirely.
                </p>
                <div className="pt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#14F1D9] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase">Proactive execution active</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-br from-[#0E0E15] to-[#7C5CFC]/5 border border-white/10 space-y-2">
                <div className="text-[10px] font-mono font-bold text-[#7C5CFC] uppercase tracking-wider">Connection Integrity</div>
                <h4 className="text-lg font-extrabold text-white">99.98% Active Handshakes</h4>
                <p className="text-xs text-[#9CA3AF] leading-relaxed font-semibold">
                  Real-time listener webhooks connected to Google Workspace, Slack, and your academic sync engines remain operational.
                </p>
                <div className="pt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#14F1D9] animate-pulse" />
                  <span className="text-[10px] font-mono font-bold text-white uppercase">All API connections active</span>
                </div>
              </div>
            </div>

            {/* Dense Ledger list: Autonomous Dispatched Actions history */}
            <div className="p-5 rounded-xl bg-[#0E0E15] border border-white/10 space-y-4 shadow-md">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-sm font-black font-display text-white uppercase tracking-wider font-mono">Autonomous Dispatch History</h3>
                  <p className="text-xs text-[#9CA3AF] mt-0.5 font-semibold">Real-time trace of letters of mitigation, extension requests, and rescheduled meetings.</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#14F1D9]/15 text-[#14F1D9] px-2.5 py-1 rounded border border-[#14F1D9]/20 uppercase">
                  Uptime Ledger
                </span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {/* Real actions that were executed */}
                {actions.filter(a => a.status === 'executed' || a.status === 'success').map((act) => (
                  <div key={act.id} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#14F1D9] font-bold">✓ DISPATCHED</span>
                        <span className="font-extrabold text-white text-sm">{act.draftSubject}</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] line-clamp-1">{act.draftBody}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right font-mono">
                      <div>
                        <div className="text-[#A78BFA] font-bold text-[10px]">RECIPIENT</div>
                        <div className="text-white font-semibold text-xs">{act.draftTo}</div>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF]">Just now</span>
                    </div>
                  </div>
                ))}

                {/* Simulated high-fidelity historical actions so it is never empty */}
                {[
                  {
                    subj: "Extension Request: Chemistry Lab Report (Crisis Mitigation)",
                    body: "Dear Dr. Ramirez, I am writing to requested a brief 12-hour extension on the Chemistry Lab Report...",
                    to: "dr.ramirez@university.edu",
                    time: "2 hours ago"
                  },
                  {
                    subj: "Agenda Draft: Vibe Studios Sync - Deliverable Alignment",
                    body: "Hi Priya, ahead of our weekly sync at 3:00 PM today, I wanted to share the core items...",
                    to: "priya.patel@vibe-studios.com",
                    time: "5 hours ago"
                  },
                  {
                    subj: "Late Submission Request: Physics Assignment 4",
                    body: "Dear Professor Sharma, I am writing to inform you that I have experienced a local container compile issue...",
                    to: "prof.sharma@university.edu",
                    time: "1 day ago"
                  }
                ].map((act, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/[0.03] transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#14F1D9] font-bold">✓ DISPATCHED</span>
                        <span className="font-extrabold text-white text-sm">{act.subj}</span>
                      </div>
                      <p className="text-xs text-[#9CA3AF] line-clamp-1 italic">"{act.body}"</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-left sm:text-right font-mono">
                      <div>
                        <div className="text-[#A78BFA] font-bold text-[10px] uppercase">Recipient</div>
                        <div className="text-white font-semibold text-xs">{act.to}</div>
                      </div>
                      <span className="text-[10px] text-[#9CA3AF] shrink-0">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left max-w-2xl">
            {/* Chief Officer Identity */}
            <div className="p-5 rounded-xl bg-[#0E0E15]/90 border border-white/5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <span className="text-lg">👤</span>
                <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider font-mono">Chief Officer Profile Identity</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#9CA3AF] uppercase font-mono tracking-wider">Full Name ID</label>
                  <input
                    type="text"
                    id="profile-name-input"
                    value={preferences.name}
                    onChange={(e) => setPreferences({ ...preferences, name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C5CFC] transition-all duration-200"
                    placeholder="e.g., Arjun Mehta"
                  />
                  <p className="text-[9px] text-[#9CA3AF]/60">Updates the workspace sidebar ID dynamically.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#9CA3AF] uppercase font-mono tracking-wider">Workplace / Email</label>
                  <input
                    type="text"
                    value={preferences.email}
                    onChange={(e) => setPreferences({ ...preferences, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C5CFC] transition-all duration-200"
                    placeholder="e.g., arjun.mehta@university.edu"
                  />
                  <p className="text-[9px] text-[#9CA3AF]/60">Email used for self-defense drafting.</p>
                </div>
              </div>
            </div>

            {/* Google Identity Access Token Scope */}
            <div className="p-5 rounded-xl bg-[#0E0E15]/90 border border-white/5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <span className="text-lg">🔑</span>
                <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider font-mono">Google Identity Access Token Scope</h3>
              </div>
              <div className="space-y-3">
                {connections.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 rounded-lg bg-[#0A0A0F] border border-white/5 hover:border-white/10 transition-all duration-150">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{c.icon}</span>
                      <div>
                        <div className="text-xs font-semibold text-white">{c.name}</div>
                        {c.connected ? (
                          <div className="text-[10px] text-[#14F1D9] font-mono">Verified: oauth2Client_v3</div>
                        ) : (
                          <div className="text-[10px] text-[#9CA3AF] font-mono">Scope disconnected</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleConnection(c.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                        c.connected
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          : "bg-[#7C5CFC]/20 text-[#A78BFA] hover:bg-[#7C5CFC]/30 shadow-[0_0_10px_rgba(124,92,252,0.1)]"
                      }`}
                    >
                      {c.connected ? "Revoke" : "Authorize"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tone Synthesis parameters */}
            <div className="p-5 rounded-xl bg-[#0E0E15]/90 border border-white/5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <span className="text-lg">🧠</span>
                <h3 className="text-xs font-bold font-display text-white uppercase tracking-wider font-mono">Autonomous Decision Tuning</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9CA3AF] uppercase font-mono tracking-wider">Persona Mode</label>
                  <select
                    value={preferences.aiTone}
                    onChange={(e) => setPreferences({ ...preferences, aiTone: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="formal">Academic & Professional (Formal)</option>
                    <option value="balanced">Balanced & Solution-Oriented</option>
                    <option value="casual">Friendly & Conversational</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[#9CA3AF] uppercase font-mono tracking-wider">AI Assertiveness</label>
                  <select
                    defaultValue="relentless"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="polite">Polite & Accommodating</option>
                    <option value="firm">Firm & Action-Led</option>
                    <option value="relentless">⚡ Relentless (ACTO Default)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD MANUAL TARGET DEADLINE MODAL */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-[#0E0E15] border border-white/10 rounded-2xl p-5 space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider font-mono">Configure Target Deadline</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-xs text-[#9CA3AF]">✕</button>
                </div>

                <form onSubmit={handleAddDeadline} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] text-[#9CA3AF] uppercase font-mono">Title</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Submit CS301 lab package"
                      className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#9CA3AF] uppercase font-mono">Description</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Include relevant compilation notes, professor details, syllabus info..."
                      className="w-full h-16 px-3 py-2 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C5CFC] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#9CA3AF] uppercase font-mono">Due At</label>
                      <input
                        type="datetime-local"
                        value={newDue}
                        onChange={(e) => setNewDue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-[#9CA3AF] uppercase font-mono">Category</label>
                      <select
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-[#0A0A0F] border border-white/10 text-xs text-white focus:outline-none"
                      >
                        <option value="work">Work</option>
                        <option value="study">Study</option>
                        <option value="personal">Personal</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#7C5CFC] hover:bg-[#A78BFA] text-white font-bold rounded-lg text-xs transition-all"
                  >
                    Establish Target ⚡
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* PURE CSS/REACT CONFETTI CELEBRATION EXPLOSION */}
        {confettiActive && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-[100] flex items-center justify-center">
            {Array.from({ length: 60 }).map((_, i) => {
              const xSpread = (Math.random() - 0.5) * 600;
              const ySpread = -Math.random() * 400 - 100;
              const delay = Math.random() * 0.15;
              const colors = ["#7C5CFC", "#14F1D9", "#F59E0B", "#EF4444", "#3B82F6", "#10B981"];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              const size = Math.random() * 10 + 5;
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                  animate={{
                    x: xSpread,
                    y: ySpread,
                    scale: [0, 1.4, 1, 0],
                    opacity: [1, 1, 0.7, 0],
                    rotate: Math.random() * 360 + 360,
                  }}
                  transition={{
                    duration: 1.8,
                    ease: "easeOut",
                    delay: delay,
                  }}
                  className="absolute rounded-sm shadow-sm"
                  style={{
                    backgroundColor: randomColor,
                    width: `${size}px`,
                    height: `${size}px`,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* SUCCESS TOAST */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="fixed top-6 right-6 z-[100] px-4 py-3 bg-[#0E0E15]/95 border-l-4 border-[#14F1D9] text-[#F1F0FF] rounded-xl shadow-2xl shadow-[#14F1D9]/10 backdrop-blur-md flex items-center gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-[#14F1D9]/20 flex items-center justify-center text-xs">
                ⚡
              </div>
              <div className="text-xs font-mono font-semibold">{toastMessage}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BEAUTIFUL REVIEW & APPROVE DRAFT SHEET MODAL */}
        <AnimatePresence>
          {isReviewModalOpen && currentAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="w-full max-w-2xl bg-[#0E0E15]/95 border border-[#7C5CFC]/30 rounded-2xl p-6 space-y-4 shadow-2xl shadow-[#7C5CFC]/10 relative overflow-hidden text-left"
              >
                {/* Visual Glass Accents */}
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#7C5CFC]/5 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-[#14F1D9]/5 blur-3xl pointer-events-none" />

                {/* Header with Lightning Bolt Accent */}
                <div className="flex justify-between items-start pb-3 border-b border-white/5 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider font-mono">
                        ACTO Autonomous Mitigator
                      </h3>
                      <p className="text-[10px] text-[#9CA3AF] font-mono">
                        POLISHED & SOLUTION-ORIENTED CORRESPONDENCE DRAFT
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsReviewModalOpen(false)}
                    className="text-xs text-[#9CA3AF] hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
                  >
                    ✕
                  </button>
                </div>

                {/* Draft Context Panel */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5 text-xs font-mono relative z-10">
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">To:</span>
                    <span className="text-white font-semibold">{currentAction.draftTo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Subject:</span>
                    <span className="text-white font-semibold">{editedSubject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9CA3AF]">Medium:</span>
                    <span className="text-[#14F1D9] font-bold">📧 Google Workspace API</span>
                  </div>
                </div>

                {/* Full Draft Email Textarea with Blinking Cursor and Typewriter Effect */}
                <div className="space-y-1 text-left relative z-10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-[#9CA3AF] uppercase font-mono tracking-wider">Email Content Draft</span>
                    <span className="text-[10px] text-[#14F1D9] font-mono">
                      {isTyping ? "⌨️ ACTO typing..." : "✍️ Live editable"}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={typedBody}
                      onChange={(e) => {
                        setTypedBody(e.target.value);
                        setEditedBody(e.target.value);
                      }}
                      disabled={isTyping}
                      className="w-full h-56 p-4 rounded-xl bg-[#0A0A0F]/80 border border-white/10 text-xs font-mono focus:outline-none focus:border-[#7C5CFC] focus:ring-1 focus:ring-[#7C5CFC] resize-none text-[#F1F0FF] leading-relaxed"
                    />
                    {isTyping && (
                      <div className="absolute right-4 bottom-4 flex items-center gap-1.5 px-2 py-1 rounded bg-[#7C5CFC]/20 text-[#A78BFA] font-mono text-[9px] uppercase tracking-wider animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#14F1D9] animate-ping" />
                        Generating Draft...
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex gap-3 justify-end pt-3 border-t border-white/5 relative z-10">
                  <button
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Dismiss Review
                  </button>
                  <button
                    onClick={() => handleExecuteAction(currentAction.id)}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#7C5CFC] to-[#14F1D9] hover:from-[#A78BFA] hover:to-[#14F1D9] text-[#0A0A0F] rounded-xl text-xs font-bold transition-all transform hover:scale-[1.02] active:scale-[0.97] flex items-center gap-1.5 shadow-lg shadow-[#7C5CFC]/20 border border-white/10"
                  >
                    <span>⚡</span> AUTONOMOUSLY DISPATCH
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
