import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  LayoutDashboard, 
  Clock, 
  ShieldAlert, 
  User as UserIcon,
  Plus, 
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Info,
  Zap,
  Brain,
  Timer,
  Check,
  Activity,
  Bell,
  Shield
} from "lucide-react";

// Types
import { Task, UserRole, ChatMessage, Nudge, DailyPlan, OverloadStatus, AutoDraft } from "./types";

// DB Storage
import { 
  fetchTasks, 
  saveTask, 
  deleteTask as dbDeleteTask, 
  getUserNameSync, 
  getUserRoleSync, 
  saveUserName, 
  saveUserRole,
  getChatHistorySync,
  saveChatHistory,
  getDailyPlanSync,
  saveDailyPlan,
  getOverloadStatusSync,
  saveOverloadStatus
} from "./lib/db";

// Firebase
import { db, auth, isFirebaseConfigured } from "./firebase";
import { 
  onAuthStateChanged, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Components
import TaskCard from "./components/TaskCard";
import AddEditTaskModal from "./components/AddEditTaskModal";
import AIChatPanel from "./components/AIChatPanel";
import DraftModal from "./components/DraftModal";

type ActiveTab = "dashboard" | "tasks" | "calendar" | "ai-plan";

export default function App() {
  // Onboarding / Profile State
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<UserRole>("Student");
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);

  // Strong Firebase Authentication States
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState<UserRole>("Student");
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [userUid, setUserUid] = useState<string | null>(null);

  // Effective AI Calendar States
  const [calendarViewMode, setCalendarViewMode] = useState<"month" | "week">("month");
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [isParsingTask, setIsParsingTask] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // App States
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  // AI Generated States
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [isLoadingNudges, setIsLoadingNudges] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [overloadStatus, setOverloadStatus] = useState<OverloadStatus | null>(null);
  const [isDetectingOverload, setIsDetectingOverload] = useState(false);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Selected Active Draft
  const [activeDraft, setActiveDraft] = useState<AutoDraft | null>(null);
  const [draftTaskTitle, setDraftTaskTitle] = useState("");

  // Calendar Navigate States
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Interactive De-procrastination Rescue (Panic Station) States
  const [isPanicOpen, setIsPanicOpen] = useState(false);
  const [panicTimerSeconds, setPanicTimerSeconds] = useState(600); // 10 minutes default
  const [isPanicTimerRunning, setIsPanicTimerRunning] = useState(false);
  const [panicRescueTask, setPanicRescueTask] = useState<Task | null>(null);
  
  // Tactical Box Breathing States
  const [isBreathingRunning, setIsBreathingRunning] = useState(false);
  const [breathingStep, setBreathingStep] = useState<"inhale" | "hold" | "exhale" | "hold2">("inhale");
  const [breathingTimer, setBreathingTimer] = useState(4);
  const [breathingCyclesCompleted, setBreathingCyclesCompleted] = useState(0);

  // Checked rescue steps
  const [checkedRescueSteps, setCheckedRescueSteps] = useState<string[]>([
    "2-minute-rule",
    "isolate-workspace"
  ]);

  // 1. Rescue countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (isPanicTimerRunning && panicTimerSeconds > 0) {
      interval = setInterval(() => {
        setPanicTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (panicTimerSeconds === 0) {
      setIsPanicTimerRunning(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPanicTimerRunning, panicTimerSeconds]);

  // 2. Box Breathing cycle timer effect
  useEffect(() => {
    let interval: any = null;
    if (isBreathingRunning) {
      interval = setInterval(() => {
        setBreathingTimer((prev) => {
          if (prev <= 1) {
            // cycle to next state
            setBreathingStep((current) => {
              if (current === "inhale") return "hold";
              if (current === "hold") return "exhale";
              if (current === "exhale") return "hold2";
              setBreathingCyclesCompleted((cycles) => cycles + 1);
              return "inhale";
            });
            return 4; // Reset to 4s for next phase
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathingTimer(4);
      setBreathingStep("inhale");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBreathingRunning]);

  // Trigger Local/Cloud Load
  useEffect(() => {
    const cachedName = getUserNameSync();
    const cachedRole = getUserRoleSync();

    if (cachedName) {
      setUserName(cachedName);
      setUserRole(cachedRole);
      setIsOnboarded(true);
    }

    setChatHistory(getChatHistorySync());
    setDailyPlan(getDailyPlanSync());
    setOverloadStatus(getOverloadStatusSync());

    // Listen for Firebase auth shifts
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserUid(user.uid);
          setIsGuestMode(false);
          // Fetch user profile from Firestore securely
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
              const uData = userDoc.data();
              if (uData.name) {
                setUserName(uData.name);
                await saveUserName(uData.name);
              }
              if (uData.role) {
                setUserRole(uData.role as UserRole);
                await saveUserRole(uData.role as UserRole);
                loadTasks(uData.role as UserRole);
              } else {
                loadTasks(cachedRole);
              }
              setIsOnboarded(true);
            } else {
              // Doc doesn't exist, create if we have cached details
              if (cachedName) {
                await setDoc(doc(db, "users", user.uid), {
                  name: cachedName,
                  role: cachedRole,
                  email: user.email,
                  createdAt: new Date().toISOString()
                }, { merge: true });
              }
              loadTasks(cachedRole);
            }
          } catch (e) {
            console.error("Error reading profile document on login:", e);
            loadTasks(cachedRole);
          }
        } else {
          setUserUid(null);
          // If not logged in and not in guest mode, force auth screen
          if (!localStorage.getItem("deadlinezero_name")) {
            setIsOnboarded(false);
          }
          loadTasks(cachedRole);
        }
      });
      return () => unsubscribe();
    } else {
      loadTasks(cachedRole);
    }
  }, []);

  const loadTasks = async (role: UserRole) => {
    setIsLoadingTasks(true);
    try {
      const data = await fetchTasks(role);
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Strong Auth Form Submission (Registration & Log In)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError("Firebase authentication is not fully initialised in the environment. Try offline demo mode!");
      return;
    }
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      if (authTab === "login") {
        // Sign in
        const userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        const user = userCredential.user;
        setUserUid(user.uid);
        setIsGuestMode(false);
        
        // Load profile from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          if (uData.name) {
            setUserName(uData.name);
            await saveUserName(uData.name);
          }
          if (uData.role) {
            setUserRole(uData.role as UserRole);
            await saveUserRole(uData.role as UserRole);
            loadTasks(uData.role as UserRole);
          }
        }
        setIsOnboarded(true);
      } else {
        // Register
        if (!authName.trim()) {
          setAuthError("Please enter your name.");
          setIsAuthLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const user = userCredential.user;
        setUserUid(user.uid);
        setIsGuestMode(false);

        // Store role & name profile to Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: authName.trim(),
          role: authRole,
          email: authEmail,
          createdAt: new Date().toISOString()
        });

        setUserName(authName.trim());
        setUserRole(authRole);
        await saveUserName(authName.trim());
        await saveUserRole(authRole);
        setIsOnboarded(true);
        loadTasks(authRole);
      }
    } catch (err: any) {
      console.error("Firebase auth error:", err);
      let errMsg = "Authentication failed. Please check your credentials.";
      if (err.code === "auth/operation-not-allowed") {
        errMsg = "Email/Password sign-in is not yet enabled in your Firebase project. To enable it: 1) Go to your Firebase Console (console.firebase.google.com). 2) Click on 'Authentication' on the left menu. 3) Click the 'Sign-in method' tab. 4) Select 'Email/Password' under Native providers, turn on 'Enable' and click Save. Meanwhile, please use the 'Offline Guest' buttons below to enter and experience the application immediately!";
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        errMsg = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "An account with this email already exists.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password must be at least 6 characters long.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (err.message) {
        errMsg = err.message;
      }
      setAuthError(errMsg);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Skip Auth (Demo/Guest offline Mode)
  const handleGuestEnter = async (chosenRole: UserRole, guestName: string) => {
    const finalName = guestName.trim() || "Guest Explorer";
    setUserName(finalName);
    setUserRole(chosenRole);
    setIsGuestMode(true);
    setIsOnboarded(true);
    await saveUserName(finalName);
    await saveUserRole(chosenRole);
    loadTasks(chosenRole);
  };

  // Sign out / Reset
  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setUserUid(null);
    setIsGuestMode(false);
    setIsOnboarded(false);
    setUserName("");
    // Clear local cache for security
    localStorage.removeItem("deadlinezero_name");
    localStorage.removeItem("deadlinezero_role");
    localStorage.removeItem("deadlinezero_tasks");
    localStorage.removeItem("deadlinezero_chat");
    localStorage.removeItem("deadlinezero_plan");
    localStorage.removeItem("deadlinezero_overload");
    setTasks([]);
  };

  // Toggle Role Filter
  const handleToggleRole = async (selectedRole: UserRole) => {
    setUserRole(selectedRole);
    await saveUserRole(selectedRole);
    loadTasks(selectedRole);
    
    // Sync updated role to firestore doc if logged in
    if (userUid && db) {
      try {
        await setDoc(doc(db, "users", userUid), { role: selectedRole }, { merge: true });
      } catch (e) {
        console.error("Failed to sync role change to cloud:", e);
      }
    }
  };

  // Smart AI Calendar Natural Language Parser Click
  const handleParseCalendarTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalLanguageQuery.trim()) return;

    setIsParsingTask(true);
    setCalendarMessage(null);

    try {
      const response = await fetch("/api/gemini/parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: naturalLanguageQuery,
          role: userRole,
          currentDate: new Date().toISOString().split("T")[0]
        })
      });

      if (!response.ok) {
        throw new Error("Failed to parse calendar task");
      }

      const data = await response.json();
      
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: data.title,
        description: data.description || "",
        deadline: data.deadline,
        priority: data.priority || "Okay",
        completed: false,
        role: data.role || userRole,
        subtasks: (data.subtasks || []).map((st: any, idx: number) => ({
          id: `sub-${Date.now()}-${idx}`,
          title: st.title,
          estimatedMinutes: st.estimatedMinutes || 30,
          completed: false
        })),
        createdAt: new Date().toISOString()
      };

      // Add to tasks list and save
      const updated = [newTask, ...tasks];
      setTasks(updated);
      await saveTask(newTask);

      // Trigger agentic engines
      triggerAgenticEngines(updated);

      setNaturalLanguageQuery("");
      setCalendarMessage({
        text: `✨ AI Calendar scheduled "${data.title}" successfully on ${data.deadline} with ${data.priority} priority!`,
        type: "success"
      });
      setTimeout(() => setCalendarMessage(null), 6000);
    } catch (err: any) {
      console.error(err);
      setCalendarMessage({
        text: "Could not parse request. Try e.g., 'physics exam next Wednesday, priority critical'",
        type: "error"
      });
    } finally {
      setIsParsingTask(false);
    }
  };

  // Smart Calendar Deadline Disperser Algorithm (To balance stacks of deadlines)
  const handleAIDisperseDeadlines = async () => {
    const activeTasks = tasks.filter(t => !t.completed);
    const dateCounts: { [date: string]: Task[] } = {};
    activeTasks.forEach(t => {
      dateCounts[t.deadline] = dateCounts[t.deadline] || [];
      dateCounts[t.deadline].push(t);
    });

    const datesWithConflicts = Object.keys(dateCounts).filter(d => dateCounts[d].length > 1);
    if (datesWithConflicts.length === 0) {
      setCalendarMessage({
        text: "⚡ No overlapping deadlines found! Your schedule is perfectly dispersed.",
        type: "success"
      });
      setTimeout(() => setCalendarMessage(null), 4000);
      return;
    }

    let updatedTasks = [...tasks];
    let changed = false;

    datesWithConflicts.forEach(date => {
      const conflicting = dateCounts[date];
      // Sort conflicting: Critical first, then Soon, then Okay
      conflicting.sort((a, b) => {
        const rank = { "Critical": 3, "Soon": 2, "Okay": 1 };
        return rank[b.priority] - rank[a.priority];
      });

      // Spreads out items starting from index 1 (keeping index 0 on original date)
      for (let i = 1; i < conflicting.length; i++) {
        const taskToReschedule = conflicting[i];
        const originalDate = new Date(date);
        originalDate.setDate(originalDate.getDate() + i);
        const newDeadline = originalDate.toISOString().split("T")[0];

        updatedTasks = updatedTasks.map(t => {
          if (t.id === taskToReschedule.id) {
            return { ...t, deadline: newDeadline };
          }
          return t;
        });
        changed = true;
      }
    });

    if (changed) {
      setTasks(updatedTasks);
      for (const t of updatedTasks) {
        await saveTask(t);
      }
      triggerAgenticEngines(updatedTasks);
      setCalendarMessage({
        text: "✨ AI scattered stack of overlapping deadlines to nearby days to prevent fatigue!",
        type: "success"
      });
      setTimeout(() => setCalendarMessage(null), 6000);
    }
  };

  // Save new task
  const handleAddTask = async (task: Task) => {
    setIsAddTaskOpen(false);
    const updated = [task, ...tasks];
    setTasks(updated);
    await saveTask(task);

    // Instantly trigger agentic engines
    triggerAgenticEngines(updated);
  };

  // Toggle complete
  const handleToggleComplete = async (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        // Mark all subtasks complete too if parent is completed
        const updatedSubs = t.subtasks.map((s) => ({ ...s, completed: nextCompleted }));
        return { ...t, completed: nextCompleted, subtasks: updatedSubs };
      }
      return t;
    });
    setTasks(updated);
    
    const task = updated.find((t) => t.id === taskId);
    if (task) {
      await saveTask(task);
    }
    triggerAgenticEngines(updated);
  };

  // Toggle Subtask
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const updatedSubs = t.subtasks.map((s) => {
          if (s.id === subtaskId) {
            return { ...s, completed: !s.completed };
          }
          return s;
        });
        const allCompleted = updatedSubs.every((s) => s.completed);
        return { ...t, subtasks: updatedSubs, completed: allCompleted };
      }
      return t;
    });
    setTasks(updated);

    const task = updated.find((t) => t.id === taskId);
    if (task) {
      await saveTask(task);
    }
    triggerAgenticEngines(updated);
  };

  const handleDeleteTask = async (taskId: string) => {
    const filtered = tasks.filter((t) => t.id !== taskId);
    setTasks(filtered);
    await dbDeleteTask(taskId);
    triggerAgenticEngines(filtered);
  };

  // Agentic AI Engines Trigger (Nudges, Prioritizer, Overload Detector)
  const triggerAgenticEngines = async (currentTasks: Task[]) => {
    const activeTasks = currentTasks.filter(t => !t.completed);
    if (activeTasks.length === 0) {
      setNudges([]);
      setDailyPlan(null);
      setOverloadStatus(null);
      return;
    }

    // Trigger in background parallel
    runPrioritizer(activeTasks);
    runOverloadDetector(activeTasks);
    runNudgeGenerator(activeTasks);
  };

  const runPrioritizer = async (activeTasks: Task[]) => {
    setIsPrioritizing(true);
    try {
      const response = await fetch("/api/gemini/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: activeTasks, role: userRole })
      });
      if (response.ok) {
        const plan: DailyPlan = await response.json();
        setDailyPlan(plan);
        await saveDailyPlan(plan);
      }
    } catch (e) {
      console.error("AI Prioritization failed", e);
    } finally {
      setIsPrioritizing(false);
    }
  };

  const runOverloadDetector = async (activeTasks: Task[]) => {
    setIsDetectingOverload(true);
    try {
      const response = await fetch("/api/gemini/overload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: activeTasks, role: userRole })
      });
      if (response.ok) {
        const status: OverloadStatus = await response.json();
        setOverloadStatus(status);
        await saveOverloadStatus(status);
      }
    } catch (e) {
      console.error("AI Overload detection failed", e);
    } finally {
      setIsDetectingOverload(false);
    }
  };

  const runNudgeGenerator = async (activeTasks: Task[]) => {
    setIsLoadingNudges(true);
    try {
      const response = await fetch("/api/gemini/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: activeTasks, role: userRole })
      });
      if (response.ok) {
        const data: Nudge[] = await response.json();
        setNudges(data);
      }
    } catch (e) {
      console.error("AI Nudge generation failed", e);
    } finally {
      setIsLoadingNudges(false);
    }
  };

  // Ask AI task-specific chat proxy
  const handleAskAITask = (task: Task) => {
    const text = `How should I approach this task: "${task.title}" with a deadline of ${task.deadline}? It has priority "${task.priority}" and the following roadmap: ${task.subtasks.map(s=>` - ${s.title} (${s.estimatedMinutes}m)`).join(", ")}. Give me a strict hourly schedule.`;
    handleSendMessage(text);
  };

  // Generate Message draft proxy
  const handleGenerateDraft = async (task: Task) => {
    try {
      const response = await fetch("/api/gemini/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: task.title, deadline: task.deadline, role: userRole })
      });
      if (response.ok) {
        const data: AutoDraft = await response.json();
        setDraftTaskTitle(task.title);
        setActiveDraft(data);
      } else {
        alert("Failed to generate communication draft.");
      }
    } catch (e) {
      console.error(e);
      alert("Draft generator connection error.");
    }
  };

  // AI Chat Messaging handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;

    const newUserMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    const nextHistory = [...chatHistory, newUserMessage];
    setChatHistory(nextHistory);
    await saveChatHistory(nextHistory);
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory, currentTasks: tasks, role: userRole })
      });

      if (!response.ok) {
        throw new Error("Chat connection failed");
      }

      const data = await response.json();
      const botResponse: ChatMessage = {
        role: "assistant",
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      const finalHistory = [...nextHistory, botResponse];
      setChatHistory(finalHistory);
      await saveChatHistory(finalHistory);
    } catch (e: any) {
      console.error(e);
      const errResponse: ChatMessage = {
        role: "assistant",
        content: "I apologize, I'm having trouble connecting to my productivity cortex. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setChatHistory([...nextHistory, errResponse]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Compute stats for Urgency Header Summary
  const activeTasks = tasks.filter(t => !t.completed);
  const criticalCount = activeTasks.filter(t => t.priority === "Critical").length;
  const soonCount = activeTasks.filter(t => t.priority === "Soon").length;
  const okayCount = activeTasks.filter(t => t.priority === "Okay").length;

  // Calendar render helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Match Prioritized Tasks
  const getPrioritizedTasks = () => {
    if (!dailyPlan?.rankedTaskIds || dailyPlan.rankedTaskIds.length === 0) {
      return activeTasks;
    }
    const prioritized: Task[] = [];
    const remaining: Task[] = [];

    activeTasks.forEach((task) => {
      if (dailyPlan.rankedTaskIds.includes(task.id)) {
        prioritized[dailyPlan.rankedTaskIds.indexOf(task.id)] = task;
      } else {
        remaining.push(task);
      }
    });

    // Remove empty slots and combine remaining
    return [...prioritized.filter(Boolean), ...remaining];
  };

  // Unified Modern Onboarding Render (No Mandatory Authentication)
  if (!isOnboarded) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background grids & flares */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="bg-[#1E293B]/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/60 shadow-2xl max-w-md w-full space-y-6 relative z-10">
          <div className="text-center space-y-3">
            <div className="mx-auto bg-gradient-to-tr from-amber-400 to-amber-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/15">
              <Sparkles className="w-8 h-8 text-[#0F172A]" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">DeadlineZero</h1>
              <p className="text-slate-400 text-xs mt-1.5 font-medium leading-relaxed">
                Your agentic AI assistant to defeat procrastination. Focus on what matters, stress-free.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Quick Profile Setup */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">What is your name?</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Alex Carter"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 rounded-xl font-bold text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Select Your Primary Focus</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAuthRole("Student")}
                  className={`py-4 rounded-xl border font-black text-xs transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    authRole === "Student"
                      ? "bg-amber-400 border-amber-400 text-slate-900 shadow-md shadow-amber-400/20"
                      : "bg-slate-800/40 text-slate-300 border-slate-700/60 hover:bg-slate-800/80"
                  }`}
                >
                  <span className="text-xl">🎓</span>
                  <span>Student Focus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthRole("Professional")}
                  className={`py-4 rounded-xl border font-black text-xs transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    authRole === "Professional"
                      ? "bg-amber-400 border-amber-400 text-slate-900 shadow-md shadow-amber-400/20"
                      : "bg-slate-800/40 text-slate-300 border-slate-700/60 hover:bg-slate-800/80"
                  }`}
                >
                  <span className="text-xl">💼</span>
                  <span>Pro Focus</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => handleGuestEnter(authRole, authName || "Guest Explorer")}
              className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold rounded-xl shadow-lg transition-all cursor-pointer text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>🚀 Launch Workspace</span>
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Optional Cloud Backup</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Collapsible/Optional Traditional login for advanced users */}
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50">
            {authTab === "login" ? (
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <p className="text-[10px] text-slate-400 font-medium">Have an active cloud-sync account? Sign in below:</p>
                {authError && (
                  <p className="text-[10px] text-rose-400 font-bold">⚠️ {authError}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="px-2.5 py-2 bg-slate-900/60 border border-slate-800 focus:border-amber-400 rounded-lg text-[10px] text-white focus:outline-none"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="px-2.5 py-2 bg-slate-900/60 border border-slate-800 focus:border-amber-400 rounded-lg text-[10px] text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthTab("register")}
                    className="text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Need registration?
                  </button>
                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="py-1 px-3 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-md cursor-pointer transition-colors"
                  >
                    {isAuthLoading ? "Syncing..." : "Sync Cloud"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <p className="text-[10px] text-slate-400 font-medium font-semibold">Create a Firebase Auth Cloud Sync account:</p>
                <div className="space-y-2">
                  <input
                    type="email"
                    required
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900/60 border border-slate-800 focus:border-amber-400 rounded-lg text-[10px] text-white focus:outline-none"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Password (min 6 chars)"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-900/60 border border-slate-800 focus:border-amber-400 rounded-lg text-[10px] text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setAuthTab("login")}
                    className="text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Back to Log In
                  </button>
                  <button
                    type="submit"
                    className="py-1 px-3 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-md cursor-pointer transition-colors"
                  >
                    Register Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F1F3F6] text-slate-800 font-sans overflow-hidden">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-full lg:w-[240px] bg-[#0F172A] flex flex-col text-white shrink-0">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/20 italic text-white">DZ</div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">DeadlineZero</h1>
          </div>
        </div>

        {/* User profile capsule */}
        <div className="p-4 bg-slate-800/40 mx-4 mb-4 rounded-xl border border-slate-700/50 space-y-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold uppercase text-xs shrink-0 shadow-md">
              {(userName || "G").substring(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{userName || "Guest User"}</p>
              <p className="text-[10px] text-slate-400 font-medium capitalize">{userRole} Focus</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Sign Out / Reset Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/30">
            <div className="flex items-center gap-1 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full ${userUid ? "bg-emerald-500" : "bg-amber-500 animate-pulse"} shrink-0`} />
              <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase truncate">
                {userUid ? "Cloud Synced" : "Offline Guest"}
              </span>
            </div>
            {!userUid && (
              <button
                onClick={() => setIsOnboarded(false)}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-extrabold tracking-wider uppercase underline cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex-1 px-4 space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-sm font-semibold text-left ${
              activeTab === "dashboard" 
                ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500" 
                : "text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-sm font-semibold text-left ${
              activeTab === "tasks" 
                ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500" 
                : "text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
            }`}
          >
            <CheckSquare className="w-4 h-4 shrink-0" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab("ai-plan")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-sm font-semibold text-left ${
              activeTab === "ai-plan" 
                ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500" 
                : "text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>AI Strategy Plan</span>
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer text-sm font-semibold text-left ${
              activeTab === "calendar" 
                ? "bg-blue-600/10 text-blue-400 border-l-4 border-blue-500" 
                : "text-slate-400 hover:text-white hover:bg-slate-800 font-medium"
            }`}
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span>Calendar View</span>
          </button>
        </nav>

        {/* Sync Status Banner */}
        <div className="p-6">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Agent Status</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {tasks.length > 0 
                ? `Gemini 2.0 is actively monitoring ${tasks.filter(t => !t.completed).length} active roadmap items.` 
                : "Gemini 2.0 is idle. Create your first task to trigger active coaching."}
            </p>
          </div>
        </div>
      </aside>

      {/* 2. MAIN INTERACTIVE AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
        
        {/* TOP BAR / URGENCY HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-full">
            <button 
              onClick={() => handleToggleRole("Professional")}
              className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${
                userRole === "Professional" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Professional
            </button>
            <button 
              onClick={() => handleToggleRole("Student")}
              className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${
                userRole === "Student" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Student
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgency Summary</p>
              <p className="text-sm font-bold text-slate-800">
                {criticalCount > 0 ? `${criticalCount} High Priority Due Today` : "No urgent overloads"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center bg-gradient-to-br from-slate-400 to-slate-600 text-white font-black text-xs uppercase shrink-0">
              {userName ? userName.substring(0, 2) : "DZ"}
            </div>
          </div>
        </header>

        {/* OVERLOAD ALERTS BANNER */}
        {overloadStatus?.isOverloaded && activeTab !== "ai-plan" && (
          <div className="bg-rose-50 border-b border-rose-100 p-4 shrink-0 flex items-start gap-3 animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️ Overload Alert Triggered</span>
                <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide animate-pulse">Critical Load</span>
              </h4>
              <p className="text-xs text-rose-800 mt-1 font-medium leading-relaxed">
                {overloadStatus.alertMessage}
              </p>
              <div className="flex flex-wrap gap-4 mt-2.5">
                <button
                  onClick={() => setActiveTab("ai-plan")}
                  className="text-xs font-black text-rose-950 underline hover:opacity-80 cursor-pointer"
                >
                  Review recommended mitigations in AI Action Plan →
                </button>
                <button
                  onClick={() => {
                    setIsPanicOpen(true);
                    const active = tasks.filter(t => !t.completed);
                    if (active.length > 0 && !panicRescueTask) {
                      setPanicRescueTask(active[0]);
                    }
                  }}
                  className="text-xs font-black text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 animate-pulse text-rose-600" />
                  <span>Activate Panic Rescue Room →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CORE CONTENT SWITCH */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* =======================================================
              TAB 1: DASHBOARD
              ======================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-tight">Completion Rate</p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">
                      {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%
                    </span>
                    <span className="text-[11px] text-emerald-500 font-bold mb-1">
                      {tasks.filter(t => t.completed).length > 0 ? "+12% vs LW" : "Active"}
                    </span>
                  </div>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-tight">Tasks Managed</p>
                  <span className="text-2xl font-black text-slate-800 tracking-tighter">{tasks.length}</span>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                  <p className="text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-tight">Overload Risk</p>
                  <span className={`text-2xl font-black tracking-tighter ${
                    criticalCount > 2 ? "text-red-500" : criticalCount > 0 ? "text-amber-500" : "text-emerald-500"
                  }`}>
                    {criticalCount > 2 ? "High" : criticalCount > 0 ? "Moderate" : "Low"}
                  </span>
                  <div className={`absolute bottom-0 left-0 w-full h-1 opacity-20 ${
                    criticalCount > 2 ? "bg-red-400" : criticalCount > 0 ? "bg-amber-400" : "bg-emerald-400"
                  }`}></div>
                </div>
              </div>

              {/* Daily Action Plan summary card if available */}
              {dailyPlan ? (
                <div className="p-5 rounded-2xl bg-[#0F172A] text-white shadow-lg space-y-4 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 shrink-0">
                    <Sparkles className="w-64 h-64 text-blue-400" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Gemini Active Daily Plan</span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs text-blue-300 font-bold tracking-wide uppercase">Core Daily Focus Theme:</span>
                    <h2 className="text-xl font-sans font-black tracking-tight text-blue-400">
                      🎯 {dailyPlan.coreFocus}
                    </h2>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    {dailyPlan.dailyPlanSummary}
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-dashed border-slate-200 bg-white text-center text-slate-400 text-xs py-8 space-y-2">
                  <Sparkles className="w-6 h-6 mx-auto text-slate-300" />
                  <p className="font-semibold">No Daily Plan active yet.</p>
                  <p className="text-slate-400 max-w-sm mx-auto">Add a task and wait for the prioritization engine to generate your plan, or trigger it directly in the AI Plan tab.</p>
                </div>
              )}

              {/* Task sections sorted by priority */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-slate-800">AI-Prioritized Daily Plan</h2>
                  <button 
                    onClick={() => setIsAddTaskOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    + New Task
                  </button>
                </div>

                {isLoadingTasks ? (
                  <div className="text-center py-12 text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loaded templates, initializing...
                  </div>
                ) : getPrioritizedTasks().length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getPrioritizedTasks().map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onToggleSubtask={handleToggleSubtask}
                        onDeleteTask={handleDeleteTask}
                        onAskAI={handleAskAITask}
                        onGenerateDraft={handleGenerateDraft}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 p-8 space-y-3">
                    <p className="text-sm font-semibold text-slate-600">You're fully up to date!</p>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">Deadline zero achieved. Add a last-minute task or assignment above to generate an actionable roadmap plan.</p>
                    <button
                      onClick={() => setIsAddTaskOpen(true)}
                      className="px-4 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Create First Task
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* =======================================================
              TAB 2: TASKS
              ======================================================= */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">All Roadmaps</h3>
              </div>

              {isLoadingTasks ? (
                <div className="text-center py-12 text-xs text-slate-400">Loading your tasks...</div>
              ) : tasks.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onToggleSubtask={handleToggleSubtask}
                      onDeleteTask={handleDeleteTask}
                      onAskAI={handleAskAITask}
                      onGenerateDraft={handleGenerateDraft}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400">No roadmaps generated. Click "Add Task" to start.</p>
                </div>
              )}
            </div>
          )}

          {/* =======================================================
              TAB 3: CALENDAR (EFFECTIVE AI CALENDAR)
              ======================================================= */}
          {activeTab === "calendar" && (
            <div className="space-y-6">
              
              {/* Core Calendar Navigation & AI Control Panel */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                      <span>✨ Effective AI Calendar</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Smart Scheduling</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">Auto-parse natural tasks, scatter deadlines, and focus by week</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setCalendarViewMode("month")}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          calendarViewMode === "month" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Month View
                      </button>
                      <button
                        onClick={() => setCalendarViewMode("week")}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          calendarViewMode === "week" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Weekly Focus
                      </button>
                    </div>

                    {/* Disperse Deadlines Action */}
                    <button
                      onClick={handleAIDisperseDeadlines}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/50 font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Scatter overlapping tasks onto different days"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Scatter Stacked Deadlines</span>
                    </button>
                  </div>
                </div>

                {/* Natural Language Smart Parser Bar */}
                <form onSubmit={handleParseCalendarTask} className="pt-2 border-t border-slate-100 flex gap-2">
                  <div className="relative flex-1">
                    <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                    <input
                      type="text"
                      placeholder="✨ AI Calendar Add: e.g. Complete math project next Thursday, priority critical"
                      value={naturalLanguageQuery}
                      onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isParsingTask || !naturalLanguageQuery.trim()}
                    className="px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isParsingTask ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <span>Add with AI</span>
                      </>
                    )}
                  </button>
                </form>

                {calendarMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold border transition-all ${
                    calendarMessage.type === "success" 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                      : "bg-rose-50 border-rose-100 text-rose-800"
                  }`}>
                    {calendarMessage.text}
                  </div>
                )}
              </div>

              {/* Overlapping Deadlines / Conflict Watcher Widget */}
              {(() => {
                const active = tasks.filter(t => !t.completed);
                const datesMap: { [date: string]: Task[] } = {};
                active.forEach(t => {
                  datesMap[t.deadline] = datesMap[t.deadline] || [];
                  datesMap[t.deadline].push(t);
                });
                const conflictingDates = Object.keys(datesMap).filter(d => datesMap[d].length > 1);

                if (conflictingDates.length > 0) {
                  return (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-rose-950 flex items-center gap-1.5">
                          <span>🚨 Workload Clashing Alert</span>
                          <span className="bg-rose-100 text-rose-800 text-[9px] px-2 py-0.5 rounded font-bold uppercase">Deadlines Stacked</span>
                        </h4>
                        <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                          You have overlapping tasks due on: <span className="font-bold underline">{conflictingDates.map(d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })).join(", ")}</span>. This can lead to cognitive exhaustion or last-minute panic.
                        </p>
                      </div>
                      <button
                        onClick={handleAIDisperseDeadlines}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors"
                      >
                        ⚡ Let AI Balance Dates
                      </button>
                    </div>
                  );
                }
                return null;
              })()}

              {/* MONTH GRID VIEW */}
              {calendarViewMode === "month" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
                  {/* Calendar Month Header Selector */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 tracking-tight">
                        {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                      <button 
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-white rounded-md transition-colors cursor-pointer text-slate-500"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-white rounded-md transition-colors cursor-pointer text-slate-500"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Month Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 border-b border-slate-100 pb-2 uppercase tracking-wider">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty offsets */}
                    {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                      <div key={`empty-${i}`} className="min-h-[90px] border border-slate-50 rounded-lg bg-slate-50/20"></div>
                    ))}

                    {/* Days in Month */}
                    {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                      const dayNum = i + 1;
                      const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
                      const dateStr = dayDate.toISOString().split("T")[0];
                      const dayTasks = tasks.filter((t) => t.deadline === dateStr);

                      const isToday = new Date().toISOString().split("T")[0] === dateStr;

                      return (
                        <div 
                          key={`day-${dayNum}`} 
                          className={`min-h-[100px] p-2 border rounded-lg flex flex-col justify-between transition-colors hover:bg-slate-50/50 ${
                            isToday ? "border-blue-500 bg-blue-50/10" : "border-slate-100 bg-white"
                          }`}
                        >
                          <span className={`text-[10px] font-bold self-end px-1.5 py-0.5 rounded-full ${
                            isToday ? "bg-blue-600 text-white" : "text-slate-400"
                          }`}>{dayNum}</span>
                          
                          <div className="flex-1 mt-1.5 space-y-1 overflow-y-auto max-h-[70px]">
                            {dayTasks.map((t) => (
                              <div 
                                key={t.id}
                                onClick={() => {
                                  handleAskAITask(t);
                                  setCalendarMessage({
                                    text: `💡 Loaded customized strategy plan for "${t.title}" in your AI Assistant! Check details on the right.`,
                                    type: "success"
                                  });
                                  setTimeout(() => setCalendarMessage(null), 5000);
                                }}
                                className={`px-1.5 py-0.5 text-[9px] font-black rounded-md truncate cursor-pointer select-none transition-all ${
                                  t.completed 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : t.priority === "Critical" 
                                      ? "bg-rose-50 text-rose-700 border border-rose-100" 
                                      : t.priority === "Soon"
                                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                                title={t.title}
                              >
                                {t.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WEEKLY FOCUS TIMELINE VIEW */}
              {calendarViewMode === "week" && (
                <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                  {(() => {
                    const weekDays = [];
                    // Find start of current week
                    const startOfWeek = new Date(currentMonth);
                    const day = startOfWeek.getDay();
                    const diff = startOfWeek.getDate() - day; // adjust to Sunday
                    const sunday = new Date(startOfWeek.setDate(diff));

                    for (let i = 0; i < 7; i++) {
                      const nextDay = new Date(sunday);
                      nextDay.setDate(sunday.getDate() + i);
                      weekDays.push(nextDay);
                    }

                    return weekDays.map((dateObj, idx) => {
                      const dateStr = dateObj.toISOString().split("T")[0];
                      const dayTasks = tasks.filter(t => t.deadline === dateStr);
                      const isToday = new Date().toISOString().split("T")[0] === dateStr;

                      return (
                        <div 
                          key={`week-day-${idx}`}
                          className={`bg-white p-4 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                            isToday ? "border-blue-400 ring-2 ring-blue-500/10 shadow-md" : "border-slate-100 shadow-xs"
                          }`}
                        >
                          {/* Week Day Header */}
                          <div className="border-b border-slate-100 pb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                            </p>
                            <h4 className={`text-base font-black ${isToday ? "text-blue-600" : "text-slate-800"}`}>
                              {dateObj.getDate()}
                            </h4>
                          </div>

                          {/* List of Tasks */}
                          <div className="flex-1 space-y-2">
                            {dayTasks.length > 0 ? (
                              dayTasks.map(t => (
                                <div 
                                  key={t.id}
                                  onClick={() => handleAskAITask(t)}
                                  className={`p-2.5 rounded-xl border text-[10px] font-bold leading-normal transition-all cursor-pointer ${
                                    t.completed 
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-100 line-through opacity-80" 
                                      : t.priority === "Critical" 
                                        ? "bg-rose-50 text-rose-800 border-rose-100 shadow-xs" 
                                        : "bg-slate-50 text-slate-700 border-slate-100"
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                      t.priority === "Critical" ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-800"
                                    }`}>{t.priority}</span>
                                  </div>
                                  <p className="line-clamp-2">{t.title}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-slate-300 italic py-2">No deadlines scheduled</p>
                            )}
                          </div>

                          {/* Role Specific Recommended Block */}
                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-[9px] font-medium text-slate-500 leading-normal">
                            <span className="font-bold text-slate-700 block mb-1">💡 Suggested Slot:</span>
                            {userRole === "Student" ? (
                              <span>📚 Study Focus: 1.5 hr block for revision and concepts drill.</span>
                            ) : (
                              <span>💼 Work block: 2 hr deep concentration sprint without alerts.</span>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Tips banner */}
              <div className="flex items-center gap-2.5 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 leading-relaxed font-medium">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Tip: Simply enter any scheduled task using normal text (e.g., "Add homework due on Monday"). The Effective AI Calendar calculates dates, categorizes urgency, parses subtasks, and updates your agenda automatically.
                </span>
              </div>
            </div>
          )}

          {/* =======================================================
              TAB 4: AI ACTION PLAN
              ======================================================= */}
          {activeTab === "ai-plan" && (
            <div className="space-y-6">
              
              {/* Force Prioritize Button if no plan */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agentic Orchestrator</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Let Gemini analyze tasks and form tactical daily guides.</p>
                </div>
                <button
                  onClick={() => triggerAgenticEngines(tasks)}
                  disabled={isPrioritizing || isDetectingOverload || activeTasks.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  {isPrioritizing ? <RefreshCw className="w-3 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Generate Tactical Plan</span>
                </button>
              </div>

              {/* Overload Detector Results */}
              {overloadStatus ? (
                <div className={`p-5 rounded-2xl border ${overloadStatus.isOverloaded ? "bg-red-50/70 border-red-100" : "bg-emerald-50/50 border-emerald-100"} space-y-4`}>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-5 h-5 ${overloadStatus.isOverloaded ? "text-red-600" : "text-emerald-600"}`} />
                    <h3 className={`font-sans font-bold text-sm ${overloadStatus.isOverloaded ? "text-red-950" : "text-emerald-950"}`}>
                      {overloadStatus.isOverloaded ? "🚨 Critical Workload Overload Detected!" : "✅ Workload Status: Perfect"}
                    </h3>
                  </div>

                  <p className="text-xs leading-relaxed font-medium text-slate-700">
                    {overloadStatus.alertMessage}
                  </p>

                  {overloadStatus.isOverloaded && overloadStatus.suggestions.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-red-100">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-red-900">Recommended Mitigations:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {overloadStatus.suggestions.map((sug, i) => {
                          const taskRef = tasks.find(t => t.id === sug.taskId);
                          return (
                            <div key={i} className="bg-white p-3 rounded-xl border border-red-100/60 shadow-xs space-y-1.5">
                              <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">{sug.action}</span>
                              <h5 className="text-xs font-bold text-slate-800 truncate">{taskRef ? taskRef.title : "Workspace deliverable"}</h5>
                              <p className="text-[11px] text-slate-500 leading-normal">{sug.justification}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 bg-white border border-slate-100 rounded-2xl">
                  Run Orchestrator above to analyze task overload status.
                </div>
              )}

              {/* Prioritization order list */}
              {dailyPlan ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
                  
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Strategic Priorities Order</h4>
                    
                    <div className="space-y-2.5">
                      {dailyPlan.rankedTaskIds.map((id, index) => {
                        const matchedTask = tasks.find((t) => t.id === id);
                        if (!matchedTask) return null;

                        return (
                          <div 
                            key={id} 
                            onClick={() => handleAskAITask(matchedTask)}
                            className="p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100/60 flex items-center justify-between gap-3 cursor-pointer transition-all hover:translate-x-1"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-[11px]">
                                {index + 1}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">{matchedTask.title}</h4>
                                <span className="text-[10px] text-slate-400 font-medium">Deadline: {matchedTask.deadline}</span>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              matchedTask.priority === "Critical" ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-600"
                            }`}>
                              {matchedTask.priority}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Coaching Briefing</h4>
                    <p className="text-sm text-slate-600 leading-relaxed font-sans">
                      {dailyPlan.dailyPlanSummary}
                    </p>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400">Click "Generate Tactical Plan" on top to formulate prioritizations.</p>
                </div>
              )}

            </div>
          )}

        </div>

      </main>

      {/* 3. RIGHT PERSISTENT AI SIDEBAR PANEL */}
      <AIChatPanel
        role={userRole}
        tasks={tasks}
        chatHistory={chatHistory}
        nudges={nudges}
        isLoadingNudges={isLoadingNudges}
        onSendMessage={handleSendMessage}
        isChatLoading={isChatLoading}
      />

      {/* 4. DIALOGS & MODALS */}
      {isAddTaskOpen && (
        <AddEditTaskModal
          role={userRole}
          onClose={() => setIsAddTaskOpen(false)}
          onSave={handleAddTask}
        />
      )}

      {activeDraft && (
        <DraftModal
          draft={activeDraft}
          taskTitle={draftTaskTitle}
          onClose={() => setActiveDraft(null)}
        />
      )}

      {/* Global Floating SOS Panic Button */}
      <button
        onClick={() => {
          setIsPanicOpen(true);
          const active = tasks.filter(t => !t.completed);
          if (active.length > 0 && !panicRescueTask) {
            setPanicRescueTask(active[0]);
          }
        }}
        className="fixed bottom-6 right-6 z-50 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs px-5 py-3.5 rounded-full shadow-lg shadow-rose-600/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse border border-rose-500/30"
      >
        <ShieldAlert className="w-4 h-4 animate-bounce" />
        <span>SOS Panic Alerter</span>
      </button>

      {/* SOS Panic Rescue Station Modal */}
      {isPanicOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative text-white animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => {
                setIsPanicOpen(false);
                setIsBreathingRunning(false);
                setIsPanicTimerRunning(false);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-xl transition-all cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
              <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/30">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Procrastination Panic Rescue Room</span>
                  <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-widest">Workout Station</span>
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">Tactical nervous-system relief and instant focus accelerators.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Breathing & Timers */}
              <div className="space-y-6">
                
                {/* PART 1: BOX BREATHING */}
                <div className="bg-[#0F172A]/50 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-amber-400" />
                      <span>Tactical Box Breathing</span>
                    </h3>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-300">
                      Cycles: {breathingCyclesCompleted}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal font-medium">
                    Regulate adrenaline and clear panic. Inhale, hold, exhale, and hold empty for 4 seconds each.
                  </p>

                  <div className="flex flex-col items-center justify-center py-4 bg-[#0F172A]/80 rounded-2xl border border-slate-800/80">
                    {/* Pulsing Visual Indicator */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl transition-all duration-1000 border-4 ${
                      isBreathingRunning 
                        ? breathingStep === "inhale" ? "bg-amber-400/10 border-amber-400 scale-110 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                          : breathingStep === "hold" ? "bg-blue-400/10 border-blue-400 scale-110 text-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.2)]"
                          : breathingStep === "exhale" ? "bg-rose-400/10 border-rose-400 scale-95 text-rose-400"
                          : "bg-purple-400/10 border-purple-400 scale-95 text-purple-400"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}>
                      {breathingTimer}s
                    </div>

                    <div className="mt-3 text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-200">
                        {!isBreathingRunning ? "OFFLINE"
                          : breathingStep === "inhale" ? "💨 Inhale Deeply"
                          : breathingStep === "hold" ? "🛑 Hold Breath"
                          : breathingStep === "exhale" ? "💨 Exhale Slowly"
                          : "🛑 Hold Empty"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {isBreathingRunning ? "Follow the expanding pulse pattern" : "Click start below to activate drill"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsBreathingRunning(!isBreathingRunning)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer text-center ${
                        isBreathingRunning ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-amber-400 hover:bg-amber-300 text-slate-900"
                      }`}
                    >
                      {isBreathingRunning ? "Pause Exercise" : "🚀 Start Box Breathing"}
                    </button>
                    {isBreathingRunning && (
                      <button
                        onClick={() => {
                          setIsBreathingRunning(false);
                          setBreathingCyclesCompleted(0);
                        }}
                        className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-xs transition-colors cursor-pointer"
                        title="Reset"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* PART 2: 10-MINUTE RESCUE ACCELERATOR */}
                <div className="bg-[#0F172A]/50 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-emerald-400" />
                      <span>10-Minute Panic Jumpstart</span>
                    </h3>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-300">
                      Emergency Sprint
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-normal font-medium">
                    Commit to work for just 10 minutes on a clashing task. Guaranteed guilt-free exit allowed once done.
                  </p>

                  <div className="bg-[#0F172A]/80 p-4 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-mono font-black text-emerald-400 tracking-tight">
                        {Math.floor(panicTimerSeconds / 60).toString().padStart(2, "0")}:
                        {(panicTimerSeconds % 60).toString().padStart(2, "0")}
                      </span>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                        {isPanicTimerRunning ? "⏱️ Sprint active!" : "Timer paused"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsPanicTimerRunning(!isPanicTimerRunning)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors ${
                          isPanicTimerRunning ? "bg-slate-800 text-slate-200" : "bg-emerald-400 hover:bg-emerald-300 text-[#0F172A]"
                        }`}
                      >
                        {isPanicTimerRunning ? "Pause" : "Start Sprint"}
                      </button>
                      <button
                        onClick={() => {
                          setIsPanicTimerRunning(false);
                          setPanicTimerSeconds(600);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-colors cursor-pointer"
                        title="Reset Timer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Task Picker for Sprint */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">Assign Focus Target:</label>
                    <select
                      value={panicRescueTask?.id || ""}
                      onChange={(e) => {
                        const matched = tasks.find(t => t.id === e.target.value);
                        if (matched) setPanicRescueTask(matched);
                      }}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-400"
                    >
                      <option value="">-- Choose active clashing task --</option>
                      {tasks.filter(t => !t.completed).map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.priority})</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Right Column: Checklists & Coping strategies */}
              <div className="space-y-6">
                
                {/* PART 3: DRILL STEPS CHECKLIST */}
                <div className="bg-[#0F172A]/50 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-rose-400" />
                    <span>Rescue Workout Checklist</span>
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 leading-normal font-medium">
                    Check off these micro-goals sequentially. Every click resets physical stress reflexes and triggers confidence.
                  </p>

                  <div className="space-y-3">
                    {[
                      { id: "isolate-workspace", text: "Isolate workspace: Disable phone notifications, close unrelated tabs.", label: "Minimize cognitive leakage" },
                      { id: "two-minute-rule", text: "The 2-Minute Rule: Just open the blank document/code file, write 1 word.", label: "Reduce friction to zero" },
                      { id: "three-micro-tasks", text: "Create 3 Micro-steps: Write them in the chat panel on the right.", label: "Deconstruct load" },
                      { id: "guilt-free-permission", text: "Accept imperfection: A rough draft completed is 100% better than avoidance.", label: "Mental release" }
                    ].map((step) => {
                      const isCompleted = checkedRescueSteps.includes(step.id);
                      return (
                        <div 
                          key={step.id}
                          onClick={() => {
                            if (isCompleted) {
                              setCheckedRescueSteps(prev => prev.filter(x => x !== step.id));
                            } else {
                              setCheckedRescueSteps(prev => [...prev, step.id]);
                            }
                          }}
                          className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2.5 ${
                            isCompleted 
                              ? "bg-slate-800/40 border-slate-800 text-slate-500 line-through opacity-60" 
                              : "bg-[#0F172A]/80 border-slate-800 hover:border-slate-700 text-slate-200"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 transition-all ${
                            isCompleted ? "bg-emerald-500 border-emerald-500 text-[#0F172A]" : "border-slate-600 bg-transparent"
                          }`}>
                            {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-normal">{step.text}</p>
                            <span className="text-[9px] text-slate-500 font-extrabold block mt-0.5 uppercase tracking-wide">{step.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PART 4: EMERGENCY COPING NUDGES */}
                <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/5 p-5 rounded-2xl border border-amber-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black text-amber-200 uppercase tracking-wide">Panic Resiliency Grounding</h4>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    Procrastination isn't a character flaw or laziness. It is your brain's **emotional threat-protection mechanism** triggered by a fear of failure or scale. Regulate, forgive yourself for avoidance, and do the smallest workoutable micro-action. You got this!
                  </p>
                </div>

              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsPanicOpen(false);
                  setIsBreathingRunning(false);
                  setIsPanicTimerRunning(false);
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Return to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
