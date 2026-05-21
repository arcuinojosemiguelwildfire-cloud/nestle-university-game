import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { animate, stagger } from 'animejs';
import {
  RotateCcw,
  Timer,
  Star,
  Volume2,
  VolumeX,
  Truck,
  BarChart3,
  TrendingUp,
  Settings,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Award,
  Eye,
  EyeOff,
  HelpCircle,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import nestleLogo from './assets/NESTLElogo-with-wordmark-white hori copy (2).png';
import nestleULogo from './assets/NestleU Logo (2).png';
import { savePlayerScore } from './supabase';

// --- Constants ---
const DEPARTMENTS = [
  {
    id: 'technical',
    name: 'Technical',
    zoneDesc: 'Process stability and equipment performance are assessed to ensure consistent product quality.',
    category: 'Foundations',
    icon: Settings
  },
  {
    id: 'marketing',
    name: 'Marketing',
    zoneDesc: 'Insights from consumer research are used to refine brand messaging and packaging direction.',
    category: 'Functions',
    icon: BarChart3
  },
  {
    id: 'supply',
    name: 'Supply Chain',
    zoneDesc: 'Material availability, transport planning, and inventory levels are reviewed to support market needs.',
    category: 'Functions',
    icon: Truck
  },
  {
    id: 'finance',
    name: 'Finance',
    zoneDesc: 'Spending trends are assessed to identify risks or variances.',
    category: 'Leading Self',
    icon: CreditCard
  },
  {
    id: 'sales',
    name: 'Sales',
    zoneDesc: 'Customer discussions focus on order volumes, promotions, and achievement of monthly targets.',
    category: 'Leading Teams',
    icon: TrendingUp
  },
];

const INITIAL_POINTS = 0;
const INITIAL_TIME = 60; // 1:00

const CATEGORY_STYLES: Record<string, {
  color: string;
  bgLight: string;
  bgMedium: string;
  border: string;
  text: string;
  shadow: string;
  badgeBg: string;
}> = {
  'Foundations': {
    color: '#5fc7c2',
    bgLight: 'rgba(95, 199, 194, 0.04)',
    bgMedium: 'rgba(95, 199, 194, 0.12)',
    border: 'rgba(95, 199, 194, 0.25)',
    text: '#2d8b86',
    shadow: 'shadow-[0_8px_30px_-4px_rgba(95,199,194,0.15)]',
    badgeBg: 'bg-[#5fc7c2]/10',
  },
  'Functions': {
    color: '#72d239',
    bgLight: 'rgba(114, 210, 57, 0.04)',
    bgMedium: 'rgba(114, 210, 57, 0.12)',
    border: 'rgba(114, 210, 57, 0.25)',
    text: '#4c921f',
    shadow: 'shadow-[0_8px_30px_-4px_rgba(114,210,57,0.15)]',
    badgeBg: 'bg-[#72d239]/10',
  },
  'Leading Self': {
    color: '#fb7b60',
    bgLight: 'rgba(251, 123, 96, 0.04)',
    bgMedium: 'rgba(251, 123, 96, 0.12)',
    border: 'rgba(251, 123, 96, 0.25)',
    text: '#cc4d32',
    shadow: 'shadow-[0_8px_30px_-4px_rgba(251,123,96,0.15)]',
    badgeBg: 'bg-[#fb7b60]/10',
  },
  'Leading Teams': {
    color: '#eea135',
    bgLight: 'rgba(238, 161, 53, 0.04)',
    bgMedium: 'rgba(238, 161, 53, 0.12)',
    border: 'rgba(238, 161, 53, 0.25)',
    text: '#b27218',
    shadow: 'shadow-[0_8px_30px_-4px_rgba(238,161,53,0.15)]',
    badgeBg: 'bg-[#eea135]/10',
  }
};

export default function App() {
  // --- State ---
  const [shuffledDepts, setShuffledDepts] = useState([...DEPARTMENTS]);
  const [shuffledZones, setShuffledZones] = useState([...DEPARTMENTS]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(INITIAL_POINTS);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [isMuted, setIsMuted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(() => {
    const stored = localStorage.getItem('nestle_player_firstname') || '';
    if (stored) return stored;
    const legacy = localStorage.getItem('nestle_player_name') || '';
    return legacy.trim().split(/\s+/)[0] || '';
  });
  const [surname, setSurname] = useState(() => {
    const stored = localStorage.getItem('nestle_player_surname') || '';
    if (stored) return stored;
    const legacy = localStorage.getItem('nestle_player_name') || '';
    const parts = legacy.trim().split(/\s+/);
    return parts.slice(1).join(' ') || '';
  });
  const [showNameError, setShowNameError] = useState(false);
  const [dbSaving, setDbSaving] = useState(false);
  const [dbSaveError, setDbSaveError] = useState<string | null>(null);
  const [dbSaveSuccess, setDbSaveSuccess] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  const playerName = `${firstName.trim()} ${surname.trim()}`.trim();
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingCountdown, setGreetingCountdown] = useState<number | null>(null);

  const zoneCoordsRef = useRef<Array<{ id: string; rect: DOMRect }>>([]);

  const updateZoneCoordinates = () => {
    const zones = document.querySelectorAll('[data-zone-id]');
    const coords: Array<{ id: string; rect: DOMRect }> = [];
    zones.forEach((node) => {
      const zoneNode = node as HTMLElement;
      const zoneId = zoneNode.getAttribute('data-zone-id');
      if (zoneId) {
        coords.push({
          id: zoneId,
          rect: zoneNode.getBoundingClientRect()
        });
      }
    });
    zoneCoordsRef.current = coords;
  };

  const getHoveredZoneId = (x: number, y: number): string | null => {
    let closestZoneId: string | null = null;
    let minDistance = Infinity;

    // Magnetic target boundary (generous 110px padding for ultra-smooth touch & mouse comfort!)
    const magneticPadding = 110;

    const coords = zoneCoordsRef.current.length > 0
      ? zoneCoordsRef.current
      : Array.from(document.querySelectorAll('[data-zone-id]')).map(node => {
        const zoneNode = node as HTMLElement;
        return {
          id: zoneNode.getAttribute('data-zone-id') || '',
          rect: zoneNode.getBoundingClientRect()
        };
      }).filter(item => item.id);

    for (let i = 0; i < coords.length; i++) {
      const { id, rect } = coords[i];

      // Calculate the visual center of the description card
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Euclidean distance from current pointer coordinates to the drop zone's center
      const distance = Math.hypot(x - centerX, y - centerY);

      // Verify if the pointer coordinates are within the comfortable padded container space
      const isInsideOrNear = (
        x >= rect.left - magneticPadding &&
        x <= rect.right + magneticPadding &&
        y >= rect.top - magneticPadding &&
        y <= rect.bottom + magneticPadding
      );

      if (isInsideOrNear) {
        // Select the mathematically nearest zone to the pointer to make alignment seamless
        if (distance < minDistance) {
          minDistance = distance;
          closestZoneId = id;
        }
      }
    }

    return closestZoneId;
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Audio Engine ---
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  // --- Audio Autoplay Policy Handler ---
  useEffect(() => {
    const resumeAudio = () => {
      try {
        const ctx = getAudioCtx();
        if (ctx && ctx.state === "suspended") {
          ctx.resume().then(() => {
            console.log("AudioContext resumed successfully");
          });
        }
      } catch (e) {
        console.error("AudioContext resume failed:", e);
      }
    };

    // Listen to initial user interactions on the page
    window.addEventListener("mousedown", resumeAudio, { passive: true });
    window.addEventListener("touchstart", resumeAudio, { passive: true });
    window.addEventListener("click", resumeAudio, { passive: true });
    window.addEventListener("keydown", resumeAudio, { passive: true });

    return () => {
      window.removeEventListener("mousedown", resumeAudio);
      window.removeEventListener("touchstart", resumeAudio);
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
  }, []);

  // --- Check Instructions Preference ---
  useEffect(() => {
    setShowInstructions(true);
  }, []);

  const handleCloseInstructions = () => {
    if (!firstName.trim() || !surname.trim()) {
      setShowNameError(true);
      return;
    }
    setShowNameError(false);
    if (dontShowAgain) {
      localStorage.setItem('nestle_hide_instructions', 'true');
    }
    localStorage.setItem('nestle_player_firstname', firstName.trim());
    localStorage.setItem('nestle_player_surname', surname.trim());
    localStorage.setItem('nestle_player_name', `${firstName.trim()} ${surname.trim()}`);
    setShowInstructions(false);
    setShowGreeting(true);
  };

  const playTone = useCallback((type: OscillatorType, freq: number, duration: number, vol = 0.18, attack = 0.01, release = 0.12) => {
    if (isMuted) return;
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration - release);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) { }
  }, [isMuted]);

  const soundPickup = useCallback(() => playTone('sine', 520, 0.12, 0.12), [playTone]);
  const soundDragOver = useCallback(() => playTone('sine', 660, 0.08, 0.07), [playTone]);
  const soundTick = useCallback(() => playTone('square', 880, 0.05, 0.04), [playTone]);

  const soundCorrect = useCallback(() => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => setTimeout(() => playTone('sine', f, 0.22, 0.15), i * 70));
  }, [playTone]);

  const soundWrong = useCallback(() => {
    playTone('sawtooth', 180, 0.28, 0.12);
    setTimeout(() => playTone('sawtooth', 140, 0.22, 0.10), 90);
  }, [playTone]);

  const soundWin = useCallback(() => {
    const melody = [523, 659, 784, 1047, 784, 1047, 1319];
    melody.forEach((f, i) => setTimeout(() => playTone('sine', f, 0.3, 0.14), i * 110));
    const chord = [523, 659, 784, 1047];
    setTimeout(() => {
      chord.forEach((f, i) => setTimeout(() => playTone('sine', f, 0.8, 0.1), i * 40));
    }, melody.length * 110 + 80);
  }, [playTone]);

  // --- Greeting Sequence Logic ---
  useEffect(() => {
    if (!showGreeting) {
      setGreetingCountdown(null);
      return;
    }

    setGreetingCountdown(3);
    playTone('sine', 523, 0.25, 0.14);
    setTimeout(() => playTone('sine', 659, 0.2, 0.12), 120);
    playTone('triangle', 440, 0.12, 0.18);

    const t1 = setTimeout(() => {
      setGreetingCountdown(2);
      playTone('triangle', 440, 0.12, 0.18);
    }, 1200);

    const t2 = setTimeout(() => {
      setGreetingCountdown(1);
      playTone('triangle', 440, 0.12, 0.18);
    }, 2400);

    const t3 = setTimeout(() => {
      setShowGreeting(false);
      playTone('sine', 880, 0.4, 0.22);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    }, 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [showGreeting, playTone]);

  // --- Initialization ---
  const initGame = useCallback((clearPlayerInfo = false) => {
    setShuffledDepts([...DEPARTMENTS].sort(() => Math.random() - 0.5));
    setShuffledZones([...DEPARTMENTS].sort(() => Math.random() - 0.5));
    setAssignments({});
    setScore(0);
    setStreak(0);
    setPoints(INITIAL_POINTS);
    setTimeLeft(INITIAL_TIME);
    setIsGameOver(false);
    setShowCorrectAnswers(false);
    setSelectedDeptId(null);
    setShowInstructions(true);
    setShowNameError(false);
    setDbSaving(false);
    setDbSaveError(null);
    setDbSaveSuccess(false);
    setScoreSaved(false);

    if (clearPlayerInfo) {
      setFirstName('');
      setSurname('');
      localStorage.removeItem('nestle_player_firstname');
      localStorage.removeItem('nestle_player_surname');
      localStorage.removeItem('nestle_player_name');
    }
  }, []);

  useEffect(() => {
    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Timer ---
  useEffect(() => {
    if (isGameOver || showInstructions || showGreeting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        if (prev <= 21) {
          soundTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGameOver, showInstructions, showGreeting, soundTick]);

  // Handle timeout evaluation
  useEffect(() => {
    if (timeLeft === 0 && !isGameOver) {
      const correctCount = Object.entries(assignments).filter(
        ([zId, dId]) => zId === dId
      ).length;
      setScore(correctCount);
      setPoints(correctCount);
      setIsGameOver(true);
      soundWrong();
    }
  }, [timeLeft, isGameOver, assignments, soundWrong]);

  // --- Game Over Animations using anime.js ---
  useEffect(() => {
    if (isGameOver) {
      const timer = setTimeout(() => {
        // 1. Spring-bounce animation for the Award badge/icon
        animate('.anime-icon', {
          scale: [0.3, 1],
          opacity: [0, 1],
          rotate: ['-20deg', '0deg'],
          duration: 1100,
          ease: 'outElastic(1, .55)'
        });

        // 2. Smooth exponential stagger for Title and Subtitle text
        animate('.anime-title, .anime-desc', {
          translateY: [25, 0],
          opacity: [0, 1],
          duration: 900,
          delay: stagger(150, { start: 150 }),
          ease: 'outCubic'
        });

        // 3. Playful 'Back' scale-up stagger for the Stats Blocks
        animate('.anime-stat', {
          scale: [0.7, 1],
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 800,
          delay: stagger(120, { start: 400 }),
          ease: 'outBack'
        });

        // 4. Elegant slide-up for certificate/review cards
        animate('.anime-review', {
          translateY: [35, 0],
          opacity: [0, 1],
          scale: [0.97, 1],
          duration: 900,
          delay: 600,
          ease: 'outCubic'
        });

        // 5. Energetic spring scale-up for the Play Again CTA button
        animate('.anime-button', {
          scale: [0.5, 1],
          opacity: [0, 1],
          translateY: [15, 0],
          duration: 1000,
          delay: 750,
          ease: 'outElastic(1, .6)'
        });
      }, 80);

      return () => clearTimeout(timer);
    }
  }, [isGameOver]);

  // --- Supabase Database Sync hook ---
  useEffect(() => {
    if (isGameOver && !scoreSaved && (firstName.trim() || surname.trim())) {
      setScoreSaved(true);
      setDbSaving(true);
      setDbSaveError(null);
      setDbSaveSuccess(false);

      savePlayerScore(firstName, surname, score)
        .then((res) => {
          setDbSaving(false);
          if (res.success) {
            setDbSaveSuccess(true);
          } else {
            setDbSaveError(res.error || 'Failed to sync score.');
          }
        })
        .catch((err) => {
          setDbSaving(false);
          setDbSaveError(err instanceof Error ? err.message : String(err));
        });
    }
  }, [isGameOver, scoreSaved, firstName, surname, score]);

  // --- Matching Logic (Drag and Drop Assignment) ---
  const handleMatch = (deptId: string, zoneId: string) => {
    // Create a copy of current assignments
    const nextAssignments = { ...assignments };

    // 1. If this department was already assigned to some other zone, clear it from there
    Object.entries(nextAssignments).forEach(([zId, dId]) => {
      if (dId === deptId) {
        delete nextAssignments[zId];
      }
    });

    // 2. Assign this department to the active zone
    nextAssignments[zoneId] = deptId;

    // Save assignments to state
    setAssignments(nextAssignments);

    // Subtle drop feedback sound
    playTone('sine', 580, 0.1, 0.12);

    // Automatically evaluate if all 5 are assigned
    if (Object.keys(nextAssignments).length === DEPARTMENTS.length) {
      setTimeout(() => {
        handleSubmitAnswers(nextAssignments);
      }, 350);
    }
  };

  const handleClearAssignment = (zoneId: string) => {
    const nextAssignments = { ...assignments };
    delete nextAssignments[zoneId];
    setAssignments(nextAssignments);
    playTone('sine', 380, 0.08, 0.1);
  };

  const handleSubmitAnswers = (currentAssignments = assignments) => {
    // Compute final correct alignments
    const correctCount = Object.entries(currentAssignments).filter(
      ([zId, dId]) => zId === dId
    ).length;

    setScore(correctCount);

    // Calculate final points (award 1 point for every correct drag)
    setPoints(correctCount);

    // Enter game over result overlay
    setIsGameOver(true);

    if (correctCount === DEPARTMENTS.length) {
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
        soundWin();
      }, 150);
    } else {
      soundWrong();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center p-2 sm:p-4 min-h-screen selection:bg-slate-200 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 nestle-pattern pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-1 bg-linear-to-r from-[#5fc7c2] via-[#72d239] via-[#fb7b60] to-[#eea135] opacity-80 z-50 animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-6xl bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/60 shadow-[0_20px_80px_rgba(26,58,107,0.06)] overflow-hidden"
      >
        {/* Top Header - Nestlé University Branding */}
        <header className="px-3 sm:px-6 py-1 sm:py-2 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-linear-to-b from-slate-50/50 to-white/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 my-0.5 sm:my-1">
            <motion.div
              whileHover={{ scale: 1.02, y: -0.5 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex items-center shrink-0 -my-1 sm:-my-2"
            >
              <img
                src={nestleULogo}
                alt="Nestlé University Logo"
                referrerPolicy="no-referrer"
                className="h-32 sm:h-36 w-auto object-contain select-none"
              />
            </motion.div>

            {playerName.trim() && (
              <div className="flex items-center sm:ml-2">
                <span className="text-[9.5px] font-brand font-black text-[#1e5aab] bg-[#1e5aab]/7 border border-[#1e5aab]/15 px-3 py-1 rounded-xl tracking-wider uppercase shadow-3xs">
                  Player: {playerName.trim()}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">

            {/* Timer only */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl border transition-all shadow-xs ${timeLeft <= 20 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
              <Timer className="w-4 h-4 opacity-70" />
              <div className="flex flex-col">
                <span className="text-[8px] font-brand font-black text-slate-400 uppercase tracking-wide leading-none mb-0.5">Timer</span>
                <span className="text-sm font-brand font-black tabular-nums leading-none">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="h-7 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-9 h-9 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
              title={isMuted ? "Unmute sounds" : "Mute sounds"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Combo Banner */}
        {streak > 1 && (
          <div className="bg-slate-900/5 px-8 py-1.5 flex items-center justify-center gap-2 border-b border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-[#72d239] animate-ping" />
            <span className="text-[9px] font-brand font-black text-slate-600 uppercase tracking-widest leading-none">
              Combo multiplier Active! +{streak * 200} Streak Points
            </span>
          </div>
        )}

        {/* Game Area - Fixed 2-Column Side-by-Side Panel Layout */}
        <div className="p-4 sm:p-5 lg:p-6 bg-linear-to-b from-white to-slate-50/30">
          <hr className="border-t border-slate-200 mb-5 -mt-1" />
          <div className="grid grid-cols-2 gap-4 mt-2 lg:gap-5 mb-2.5">
            {/* Column Title Cards */}
            <div>
              <h2 className="font-brand font-black text-slate-700 text-xs uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded bg-[#eea135] text-[10px] sm:text-[11px] text-white flex items-center justify-center font-brand font-black shadow-xs">1</span>
                Departments
              </h2>
            </div>
            <div>
              <h2 className="font-brand font-black text-slate-700 text-xs uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded bg-[#eea135] text-[10px] sm:text-[11px] text-white flex items-center justify-center font-brand font-black shadow-xs">2</span>
                Description
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5 items-stretch">
            {Array.from({ length: DEPARTMENTS.length }).map((_, index) => {
              const dept = shuffledDepts[index];
              const zone = shuffledZones[index];
              const isMatched = Object.values(assignments).includes(dept.id);
              const isAssigned = assignments[zone.id] !== undefined;

              // Styles for the currently selected department (tap-to-align support)
              const selectedDept = DEPARTMENTS.find(d => d.id === selectedDeptId);
              const selectedStyle = selectedDept ? CATEGORY_STYLES[selectedDept.category] : null;

              // Active zone check (handles both pointer dragging and selection tapping)
              const isActive = activeZoneId === zone.id || (selectedDeptId !== null && assignments[zone.id] === undefined && activeZoneId === zone.id);
              const Icon = dept.icon;

              const assignedDeptId = assignments[zone.id];
              const assignedDept = DEPARTMENTS.find(d => d.id === assignedDeptId);
              const AssignedIcon = assignedDept?.icon;
              const assignedDeptStyle = assignedDept ? CATEGORY_STYLES[assignedDept.category] : null;

              // Styles according to correct category
              const deptStyle = CATEGORY_STYLES[dept.category];
              const zoneStyle = CATEGORY_STYLES[zone.category];
              const isSelected = selectedDeptId === dept.id;

              const activeDraggedDept = draggedId ? DEPARTMENTS.find(d => d.id === draggedId) : null;
              const draggedStyle = activeDraggedDept ? CATEGORY_STYLES[activeDraggedDept.category] : null;
              const hoverStyle = draggedStyle || selectedStyle || zoneStyle;

              return (
                <React.Fragment key={index}>
                  {/* Draggable Card (Left 50%) */}
                  <motion.div
                    key={`draggable-dept-${dept.id}-${isMatched}`}
                    drag={!isMatched}
                    dragSnapToOrigin={true}
                    dragElastic={0}
                    dragMomentum={false}
                    dragTransition={{ bounceStiffness: 600, bounceDamping: 32 }}
                    animate={{ x: 0, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    whileDrag={{
                      scale: 1.08,
                      rotate: 2.2,
                      zIndex: 200,
                      borderColor: '#eea135',
                      boxShadow: '0 25px 45px -5px rgba(238,161,53,0.35), 0 10px 20px -10px rgba(238,161,53,0.2)'
                    }}
                    onMouseDown={() => {
                      if (!isMatched) {
                        try {
                          const ctx = getAudioCtx();
                          if (ctx.state === 'suspended') ctx.resume();
                        } catch (e) { }
                      }
                    }}
                    onTouchStart={() => {
                      if (!isMatched) {
                        try {
                          const ctx = getAudioCtx();
                          if (ctx.state === 'suspended') ctx.resume();
                        } catch (e) { }
                      }
                    }}
                    onDragStart={() => {
                      updateZoneCoordinates();
                      setDraggedId(dept.id);
                      soundPickup();
                    }}
                    onDrag={(event, info) => {
                      // Retrieve precise client/viewport coordinates relative to scroll/touch offsets safely
                      let clientX = info.point.x;
                      let clientY = info.point.y;

                      const rawEvent = event as any;
                      if (rawEvent) {
                        if (rawEvent.touches && rawEvent.touches[0]) {
                          clientX = rawEvent.touches[0].clientX;
                          clientY = rawEvent.touches[0].clientY;
                        } else if (rawEvent.changedTouches && rawEvent.changedTouches[0]) {
                          clientX = rawEvent.changedTouches[0].clientX;
                          clientY = rawEvent.changedTouches[0].clientY;
                        } else if (rawEvent.clientX !== undefined) {
                          clientX = rawEvent.clientX;
                          clientY = rawEvent.clientY;
                        }
                      }

                      const hoveredId = getHoveredZoneId(clientX, clientY);
                      if (hoveredId !== activeZoneId) {
                        if (hoveredId) {
                          soundDragOver();
                        }
                        setActiveZoneId(hoveredId);
                      }
                    }}
                    onDragEnd={(event, info) => {
                      setDraggedId(null);
                      setActiveZoneId(null);
                      zoneCoordsRef.current = [];

                      let clientX = info.point.x;
                      let clientY = info.point.y;

                      const rawEvent = event as any;
                      if (rawEvent) {
                        if (rawEvent.touches && rawEvent.touches[0]) {
                          clientX = rawEvent.touches[0].clientX;
                          clientY = rawEvent.touches[0].clientY;
                        } else if (rawEvent.changedTouches && rawEvent.changedTouches[0]) {
                          clientX = rawEvent.changedTouches[0].clientX;
                          clientY = rawEvent.changedTouches[0].clientY;
                        } else if (rawEvent.clientX !== undefined) {
                          clientX = rawEvent.clientX;
                          clientY = rawEvent.clientY;
                        }
                      }

                      const targetZoneId = getHoveredZoneId(clientX, clientY);
                      if (targetZoneId) {
                        handleMatch(dept.id, targetZoneId);
                      }
                    }}
                    onTap={() => {
                      if (isMatched) return;
                      if (selectedDeptId === dept.id) {
                        setSelectedDeptId(null);
                      } else {
                        setSelectedDeptId(dept.id);
                        soundPickup();
                      }
                    }}
                    whileHover={!isMatched ? { scale: 1.015, x: 2, borderColor: '#eea135' } : {}}
                    whileTap={!isMatched ? { scale: 0.985 } : {}}
                    style={{
                      boxShadow: isSelected
                        ? '0 0 0 1px #eea135, 0 10px 25px -4px rgba(238,161,53,0.3)'
                        : isMatched
                          ? 'none'
                          : '0 3px 10px -4px rgba(238,161,53,0.12)',
                      borderColor: isMatched
                        ? '#e2e8f0'
                        : '#eea135',
                    }}
                    className={`
                      group relative flex flex-row items-center gap-3.5 p-3.5 sm:p-4 py-4.5 sm:py-5.5 rounded-2xl transition-colors duration-200 cursor-grab active:cursor-grabbing bg-white select-none min-h-[68px] sm:min-h-[82px] lg:min-h-[90px] touch-none
                      ${isMatched
                        ? 'opacity-35 border border-slate-100/50 cursor-default pointer-events-none'
                        : isSelected
                          ? 'border-2 shadow-md z-10'
                          : 'border-2 shadow-xs hover:shadow-md'
                      }
                    `}
                  >
                    {/* Left Icon Block precisely matching the uploaded design */}
                    <div
                      style={{
                        backgroundColor: isMatched ? '#f1f5f9' : isSelected ? `${deptStyle.color}15` : `${deptStyle.color}08`,
                        borderColor: isMatched ? '#e2e8f0' : `${deptStyle.color}15`,
                        color: isMatched ? '#94a3b8' : deptStyle.color
                      }}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-3xs transition-all duration-200"
                    >
                      <Icon className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    {/* Department Title */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className={`font-brand font-bold text-xs sm:text-[14px] lg:text-[15px] leading-tight tracking-tight transition-colors duration-200 ${isMatched
                        ? 'text-slate-400 line-through decoration-slate-200/60'
                        : 'text-[#134988]'
                        }`}>
                        {dept.name}
                      </h3>
                    </div>

                    {/* Grab Dots Indicator on the far right */}
                    {!isMatched && (
                      <div className="ml-auto flex gap-1.5 opacity-25 group-hover:opacity-60 transition-opacity text-slate-400 shrink-0 animate-pulse">
                        <div className="flex flex-col gap-1.5">
                          <span className="w-1 h-1 bg-current rounded-full" />
                          <span className="w-1 h-1 bg-current rounded-full" />
                          <span className="w-1 h-1 bg-current rounded-full" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="w-1 h-1 bg-current rounded-full" />
                          <span className="w-1 h-1 bg-current rounded-full" />
                          <span className="w-1 h-1 bg-current rounded-full" />
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* Alignment Dropzone (Right 50%) - Clean style before Submit */}
                  <motion.div
                    data-zone-id={zone.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (activeZoneId !== zone.id) {
                        soundDragOver();
                      }
                      setActiveZoneId(zone.id);
                    }}
                    onDragLeave={() => setActiveZoneId(null)}
                    onDrop={() => {
                      setActiveZoneId(null);
                      if (draggedId) handleMatch(draggedId, zone.id);
                    }}
                    onTap={() => {
                      if (selectedDeptId) {
                        handleMatch(selectedDeptId, zone.id);
                        setSelectedDeptId(null);
                      }
                    }}
                    whileHover={!isAssigned && selectedDeptId !== null ? { scale: 1.015 } : {}}
                    whileTap={!isAssigned && selectedDeptId !== null ? { scale: 0.985 } : {}}
                    animate={{
                      scale: isActive ? 1.04 : 1,
                      borderColor: isActive
                        ? '#72d239'
                        : isAssigned
                          ? '#72d239'
                          : '#cbd5e1',
                      backgroundColor: isActive
                        ? 'rgba(114, 210, 57, 0.05)'
                        : selectedDeptId !== null && !isAssigned
                          ? 'rgba(114, 210, 57, 0.02)'
                          : '#ffffff',
                      boxShadow: isActive
                        ? '0 12px 24px -4px rgba(114,210,57,0.25), 0 4px 12px -2px rgba(114,210,57,0.15)'
                        : '0 1px 3px 0 rgba(0,0,0,0.01)',
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className={`
                      relative flex flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 min-h-[72px] sm:min-h-[86px] lg:min-h-[94px] select-none cursor-pointer
                      ${isAssigned
                        ? 'border-solid shadow-3xs'
                        : 'border-dashed hover:shadow-3xs'
                      }
                      ${selectedDeptId !== null && !isAssigned ? 'ring-2 ring-transparent bg-slate-50/20' : ''}
                    `}
                  >
                    {/* Left text block with clean, dynamic typography */}
                    <div className="flex-1 min-w-0 pr-1.5">
                      <p className="text-[11.5px] sm:text-[13px] lg:text-[13.5px] font-brand font-medium leading-snug text-[#2d405a] transition-all duration-300">
                        {zone.zoneDesc}
                      </p>
                    </div>

                    {/* Right side target box displaying the assigned department and clear clicker */}
                    <div
                      style={{
                        backgroundColor: isAssigned ? '#f8fafc' : '#ffffff',
                        borderColor: '#cbd5e1'
                      }}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-200 relative"
                    >
                      {isAssigned ? (
                        <div className="relative flex items-center justify-center w-full h-full">
                          {AssignedIcon && (
                            <AssignedIcon
                              style={{ color: assignedDeptStyle?.color }}
                              className="w-5 h-5 stroke-[2.2]"
                            />
                          )}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearAssignment(zone.id);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all shadow-3xs cursor-pointer text-[10px] font-black leading-none z-20 animate-fade-in"
                            title="Remove assignment"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{ borderColor: isActive ? '#72d239' : '#cbd5e1' }}
                          className={`w-4.5 h-4.5 rounded-full border border-dashed transition-all duration-200 ${isActive ? 'animate-spin border-t-transparent' : 'border-slate-300'}`}
                        />
                      )}
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Progress Section */}
          <div className="mt-5 sm:mt-6 flex flex-col items-center justify-center border-t border-slate-100 pt-4">
            <div className="text-center">

              <p className="text-[10.5px] text-slate-400 mt-0.5">
                Drag each department card, or tap to select and pair them, with their matching descriptions on the right.
              </p>
            </div>
          </div>
        </div>

        {/* Win/Loss Overlay */}
        <AnimatePresence>
          {isGameOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-sm overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-start text-center"
            >
              {/* Vibrant ambient color blends to create a soft glowing backdrop */}
              <div className="absolute top-10 left-10 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#5fc7c2]/10 blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute bottom-10 right-10 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#72d239]/8 blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-[#fb7b60]/8 blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full bg-[#eea135]/8 blur-3xl pointer-events-none" />

              <div className="absolute inset-0 nestle-pattern opacity-[0.02] pointer-events-none" />

              <div className="flex min-h-full w-full flex-col items-center justify-start relative pt-2 pb-8 sm:pt-4 sm:pb-12 z-10">
                <div className={`w-full max-w-2xl p-[1px] rounded-[2.5rem] ${score === DEPARTMENTS.length
                  ? 'bg-linear-to-r from-[#72d239] to-[#5fc7c2]'
                  : 'bg-linear-to-r from-[#fb7b60] to-[#eea135]'
                  } shadow-[0_35px_80px_rgba(0,0,0,0.45)] mt-1 mb-4 sm:mt-2 relative z-10`}>

                  <div className="w-full bg-white/95 rounded-[2.4rem] p-5 sm:p-7 text-center relative overflow-hidden shadow-inner">
                    <div className="absolute inset-0 nestle-pattern opacity-[0.02] pointer-events-none" />

                    {/* Icon Area */}
                    <div
                      className={`anime-icon w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 relative shadow-md opacity-0 ${score === DEPARTMENTS.length
                        ? 'bg-linear-to-br from-[#72d239] to-[#5fc7c2] shadow-[0_10px_20px_-8px_rgba(114,210,57,0.4)]'
                        : 'bg-linear-to-br from-[#fb7b60] to-[#eea135] shadow-[0_10px_20px_-8px_rgba(251,123,96,0.4)]'
                        }`}
                    >
                      <Award className="w-7 h-7 text-white" />
                      <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md animate-pulse" />
                    </div>

                    {/* Typography Heading */}
                    <h1 className="anime-title font-brand font-black text-2.5xl sm:text-4xl mb-2 uppercase tracking-tight opacity-0">
                      {score === DEPARTMENTS.length ? (
                        <span className="bg-clip-text text-transparent bg-linear-to-r from-[#2d8b86] to-[#4c921f]">
                          Congratulations<span className="text-[#72d239]">!</span>
                        </span>
                      ) : (
                        <span className="bg-clip-text text-transparent bg-linear-to-r from-[#cc4d32] to-[#b27218]">
                          Nice <span className="text-[#eea135]">Try!</span>
                        </span>
                      )}
                    </h1>

                    <p className="anime-desc text-slate-600 font-medium text-xs sm:text-sm mb-5 max-w-lg mx-auto leading-relaxed opacity-0">
                      {score === DEPARTMENTS.length
                        ? "Fantastic! You have successfully aligned the departments of Nestlé University."
                        : timeLeft <= 0
                          ? "Time has expired, but learning never stops! Review your match summary below to improve."
                          : "Good attempt! Dynamic challenges require proper tuning. Review the guide below to master alignments!"}
                    </p>

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-5">
                      <div
                        style={{
                          borderColor: score === DEPARTMENTS.length ? 'rgba(114, 210, 57, 0.2)' : 'rgba(238, 161, 53, 0.2)',
                          backgroundColor: score === DEPARTMENTS.length ? 'rgba(114, 210, 57, 0.04)' : 'rgba(238, 161, 53, 0.04)'
                        }}
                        className="anime-stat border rounded-2xl p-3.5 flex flex-col items-center shadow-xs transition-colors hover:bg-slate-50/50 opacity-0"
                      >
                        <span className="font-brand font-black text-xl sm:text-2.5xl text-[#eea135] mb-0.5">{points}</span>
                        <span className="text-[9px] text-slate-500 font-brand font-black uppercase tracking-wider">Points</span>
                      </div>

                      <div
                        style={{
                          borderColor: score === DEPARTMENTS.length ? 'rgba(95, 199, 194, 0.2)' : 'rgba(251, 123, 96, 0.2)',
                          backgroundColor: score === DEPARTMENTS.length ? 'rgba(95, 199, 194, 0.04)' : 'rgba(251, 123, 96, 0.04)'
                        }}
                        className="anime-stat border rounded-2xl p-3.5 flex flex-col items-center shadow-xs transition-colors hover:bg-slate-50/50 opacity-0"
                      >
                        <span className="font-brand font-black text-xl sm:text-2.5xl text-[#5fc7c2] mb-0.5">{score}/5</span>
                        <span className="text-[9px] text-slate-500 font-brand font-black uppercase tracking-wider">Department Aligned</span>
                      </div>
                    </div>

                    {/* Clean review layout "Show Correct Answers" container */}
                    {score === DEPARTMENTS.length && (
                      <div className="anime-review border-t border-slate-100 pt-4.5 mt-4 pb-1 text-center flex flex-col items-center justify-center opacity-0">
                        {/* Visual representation of a Nestlé University certificate of completion */}
                        <div className="w-full border-2 border-dashed border-[#72d239]/30 rounded-2xl p-8 bg-slate-50/50 relative overflow-hidden flex flex-col items-center justify-center h-[250px] select-none">
                          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#72d239]/5 blur-xl pointer-events-none" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-[#5fc7c2]/5 blur-xl pointer-events-none" />

                          <Award className="w-11 h-11 text-[#72d239] mb-2 px-0.5 opacity-90" />
                          <span className="text-[10px] font-brand font-black uppercase tracking-widest text-[#2d8b86] mb-1">
                            Nestlé University
                          </span>
                          <h3 className="font-brand font-black text-slate-800 text-base sm:text-lg uppercase tracking-tight leading-tight">
                            Certificate of Alignment
                          </h3>
                          {playerName.trim() && (
                            <div className="mt-1.5 flex flex-col items-center">
                              <span className="text-[8px] my-2 font-brand font-black text-[#72d239] uppercase tracking-widest leading-none">Awarded to</span>
                              <span className="text-xs sm:text-sm font-black text-slate-850 tracking-wide font-brand border-b border-[#72d239]/30 px-3 py-0.5 mt-0.5 inline-block">
                                {playerName.trim()}
                              </span>
                            </div>
                          )}
                          <p className="text-slate-500 text-[10px] sm:text-xs mt-2 max-w-sm leading-relaxed font-brand font-medium">
                            Awarded for perfectly matching the goals, operations, and strategic values of the five organizational departments.
                          </p>
                        </div>
                      </div>
                    )}

                    {score !== DEPARTMENTS.length && (
                      <div className="anime-review border-t border-slate-100 pt-4.5 mt-4 pb-1 text-left opacity-0">
                        <div className="flex items-center justify-between mb-2.5">
                          <h3 className="font-brand font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                            <GraduationCap className="w-5 h-5 text-[#5fc7c2]" />
                            Correct Answers
                          </h3>
                        </div>

                        {/* Staggered educational answers deck */}
                        <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                          {DEPARTMENTS.map((item) => {
                            const style = CATEGORY_STYLES[item.category];
                            const MatchIcon = item.icon;
                            return (
                              <div
                                key={item.id}
                                className="bg-slate-50 border border-slate-100/90 p-2.5 rounded-xl flex items-start gap-3 transition-all hover:bg-slate-100/60"
                              >
                                <div
                                  style={{ backgroundColor: style.bgMedium, color: style.color }}
                                  className="p-1.5 rounded-lg shrink-0 border border-slate-100"
                                >
                                  <MatchIcon className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center flex-wrap gap-2 mb-1">
                                    <h4 className="font-brand font-black text-slate-800 text-sm">{item.name}</h4>
                                  </div>
                                  <p className="text-slate-500 text-xs leading-relaxed mt-1">
                                    Goal: <span className="font-medium font-brand text-slate-600">{item.zoneDesc}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Play Again Button */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center mt-5">
                      <button
                        onClick={() => initGame(true)}
                        style={{
                          background: score === DEPARTMENTS.length
                            ? 'linear-gradient(to right, #72d239, #5fc7c2)'
                            : 'linear-gradient(to right, #fb7b60, #eea135)'
                        }}
                        className="anime-button w-full sm:w-auto text-white font-brand font-black px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2.5 text-sm uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl opacity-0 transform active:scale-95 duration-200"
                      >
                        <RotateCcw className="w-4.5 h-4.5" />
                        Play Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Instructional Overlay */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 15 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className="bg-white/95 backdrop-blur-lg w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200/60 flex flex-col"
              >
                <div className="bg-[#134988] px-2 py-4 text-white flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 nestle-pattern opacity-[0.06] pointer-events-none" />
                  <img
                    src={nestleLogo}
                    alt="Nestlé Logo"
                    referrerPolicy="no-referrer"
                    className="h-20 w-auto object-contain relative z-10"
                  />
                </div>

                <div className="p-6 space-y-5">

                  {/* Mechanics block */}
                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4.5 space-y-3.5">
                    <h4 className="font-brand font-black text-[11px] uppercase tracking-widest text-[#134988] border-b border-slate-150 pb-1.5 flex items-center gap-2">
                      Mechanics:
                    </h4>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#5fc7c2] mt-1.5 shrink-0" />
                        <p className="text-xs text-slate-700 font-medium leading-relaxed font-brand">
                          Drag the <span className="font-black text-[#134988]">Department Title</span> to its corresponding description on the right.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#72d239] mt-1.5 shrink-0" />
                        <p className="text-xs text-slate-700 font-medium leading-relaxed font-brand">
                          Align all <span className="font-black text-[#134988]">5 departments</span> correctly within <span className="font-black text-[#134988]">1 minute</span>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Player Name Input Block */}
                  <div className="space-y-3.5 border-t border-slate-100 pt-4.5">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[9px] font-brand font-black uppercase tracking-wider text-slate-500">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            if (e.target.value.trim() && surname.trim()) {
                              setShowNameError(false);
                            }
                          }}
                          placeholder="e.g. Henri"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#134988] rounded-xl px-3.5 py-2.5 text-slate-800 text-xs font-semibold font-brand transition-all duration-200 focus:outline-hidden focus:ring-4 focus:ring-[#134988]/5"
                          required
                        />
                      </div>
                      <div className="space-y-1.5 text-left">
                        <label className="block text-[9px] font-brand font-black uppercase tracking-wider text-slate-500">
                          Surname
                        </label>
                        <input
                          type="text"
                          value={surname}
                          onChange={(e) => {
                            setSurname(e.target.value);
                            if (firstName.trim() && e.target.value.trim()) {
                              setShowNameError(false);
                            }
                          }}
                          placeholder="e.g. Nestlé"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#134988] rounded-xl px-3.5 py-2.5 text-slate-800 text-xs font-semibold font-brand transition-all duration-200 focus:outline-hidden focus:ring-4 focus:ring-[#134988]/5"
                          required
                        />
                      </div>
                    </div>

                    {showNameError && (
                      <p className="text-[10px] sm:text-xs font-brand font-black text-rose-500 leading-tight text-center py-1 bg-rose-50 border border-rose-100 rounded-xl animate-pulse">
                        Both First Name and Surname are required!
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={handleCloseInstructions}
                      className="w-full text-white font-brand font-black py-4 rounded-2xl shadow-xl shadow-[#134988]/20 transition-all font-black uppercase text-xs tracking-wider transform active:scale-[0.985] cursor-pointer bg-[#134988] hover:bg-[#0f3a6d]"
                    >
                      START
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Interactive Greeting Overlay */}
        <AnimatePresence>
          {showGreeting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none overflow-hidden"
            >
              {/* Soft futuristic glowing background orbs with our specific color palette */}
              <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#5fc7c2]/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#72d239]/8 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-[#fb7b60]/8 rounded-full blur-[90px] pointer-events-none" />
              <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-[#eea135]/8 rounded-full blur-[90px] pointer-events-none" />

              <div className="relative z-10 max-w-md w-full px-4">
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.94, opacity: 0, y: -20 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-[3rem] p-8 sm:p-10 shadow-[0_30px_70px_-15px_rgba(19,73,136,0.22)] relative overflow-hidden w-full flex flex-col justify-between items-center min-h-[450px] h-auto"
                >
                  {/* Delicate glowing top highlights */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-linear-to-r from-transparent via-[#5fc7c2]/40 to-transparent" />
                  <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#5fc7c2]/8 rounded-full blur-2xl animate-pulse" />
                  <div className="absolute -bottom-20 -left-16 w-36 h-36 bg-[#72d239]/8 rounded-full blur-3xl" />

                  {/* Dynamic greeting message */}
                  <div className="flex flex-col items-center text-center w-full space-y-5 pb-2">
                    <div className="space-y-2 w-full">
                      <h2 className="text-[#134988] text-2.5xl sm:text-3xl font-brand font-black tracking-tight leading-none">
                        Hello,
                      </h2>
                      <div className="px-5 py-2.5 bg-[#134988]/5 border border-[#134988]/10 rounded-2xl inline-block max-w-[340px] shadow-3xs break-words">
                        <span className="bg-gradient-to-r from-[#134988] via-[#1e5aab] to-[#5fc7c2] bg-clip-text text-transparent font-brand font-black text-xl sm:text-2xl drop-shadow-3xs leading-relaxed break-words block">
                          {playerName.trim() || 'Nestlé Champion'}
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-500 text-[11px] sm:text-[12px] font-brand font-black uppercase tracking-widest leading-none pt-1">
                      The game will start in
                    </p>
                  </div>

                  {/* Core High-fidelity Countdown Dial section */}
                  <div className="my-6 relative flex items-center justify-center shrink-0">
                    {/* Ring Pulse/Ripple effect */}
                    <AnimatePresence>
                      <motion.div
                        key={`pulse-${greetingCountdown}`}
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 1.4, opacity: 0 }}
                        exit={{ scale: 1.4, opacity: 0 }}
                        transition={{ duration: 0.95, ease: "easeOut" }}
                        style={{
                          borderColor: '#72d239'
                        }}
                        className="absolute w-24 h-24 border rounded-full pointer-events-none"
                      />
                    </AnimatePresence>

                    {/* SVG Progress Circle */}
                    <svg className="w-24 h-24 transform -rotate-90 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        className="stroke-slate-50 fill-white"
                        strokeWidth="4"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="38"
                        className="stroke-slate-100/70 fill-none"
                        strokeWidth="4.5"
                      />
                      <motion.circle
                        cx="48"
                        cy="48"
                        r="38"
                        className="fill-none"
                        style={{
                          stroke: '#72d239',
                        }}
                        strokeWidth="5"
                        strokeDasharray={2 * Math.PI * 38}
                        initial={{ strokeDashoffset: 0 }}
                        animate={{
                          strokeDashoffset: (2 * Math.PI * 38) * (1 - (greetingCountdown || 3) / 3)
                        }}
                        transition={{ type: 'spring', stiffness: 90, damping: 15 }}
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Center Countdown text with dynamic pop animation */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={greetingCountdown}
                          initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 1.4, opacity: 0, rotate: 15 }}
                          transition={{ type: "spring", stiffness: 450, damping: 18 }}
                          style={{
                            color: '#72d239'
                          }}
                          className="text-4xl sm:text-4.5xl font-brand font-black leading-none select-none drop-shadow-sm font-sans"
                        >
                          {greetingCountdown}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>

                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer Branding */}
      <footer className="fixed bottom-6 flex flex-col items-center gap-2 pointer-events-none opacity-40 transition-opacity hover:opacity-150">
        <div className="flex items-center gap-1.5">

        </div>
      </footer>
    </div>
  );
}
