import { db, auth, isFirebaseConfigured } from "../firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { Task, UserRole, DailyPlan, ChatMessage, OverloadStatus } from "../types";

const LOCAL_KEYS = {
  TASKS: "deadlinezero_tasks",
  ROLE: "deadlinezero_role",
  NAME: "deadlinezero_name",
  CHAT: "deadlinezero_chat",
  PLAN: "deadlinezero_plan",
  OVERLOAD: "deadlinezero_overload",
};

// Standard fallback mock state
const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Complete Chemistry Lab Report",
    description: "Write up findings on gas laws, include chemical equations and graph of volume vs. temperature.",
    deadline: new Date(Date.now() + 86400000 * 1.5).toISOString().split("T")[0], // Tomorrow and half
    priority: "Critical",
    completed: false,
    role: "Student",
    subtasks: [
      { id: "sub-1-1", title: "Format data tables", estimatedMinutes: 20, completed: true },
      { id: "sub-1-2", title: "Plot V-T temperature graph", estimatedMinutes: 40, completed: false },
      { id: "sub-1-3", title: "Draft conclusion & error analysis", estimatedMinutes: 60, completed: false }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: "task-2",
    title: "Client Pitch Deck Review",
    description: "Finalize value proposition slides, revenue projections, and team structure before final rehearsal.",
    deadline: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0], // 3 days away
    priority: "Soon",
    completed: false,
    role: "Professional",
    subtasks: [
      { id: "sub-2-1", title: "Check financial numbers", estimatedMinutes: 30, completed: false },
      { id: "sub-2-2", title: "Optimize slide layouts", estimatedMinutes: 45, completed: false }
    ],
    createdAt: new Date().toISOString()
  }
];

export async function saveUserRole(role: UserRole): Promise<void> {
  localStorage.setItem(LOCAL_KEYS.ROLE, role);
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), { role }, { merge: true });
    } catch (e) {
      console.error("Firestore user role save failed:", e);
    }
  }
}

export function getUserRoleSync(): UserRole {
  return (localStorage.getItem(LOCAL_KEYS.ROLE) as UserRole) || "Student";
}

export async function saveUserName(name: string): Promise<void> {
  localStorage.setItem(LOCAL_KEYS.NAME, name);
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      await setDoc(doc(db, "users", auth.currentUser.uid), { name }, { merge: true });
    } catch (e) {
      console.error("Firestore user name save failed:", e);
    }
  }
}

export function getUserNameSync(): string {
  return localStorage.getItem(LOCAL_KEYS.NAME) || "";
}

export async function fetchTasks(role: UserRole): Promise<Task[]> {
  // If Firestore is available and user is authenticated, load from Cloud
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      const q = query(
        collection(db, "tasks"), 
        where("userId", "==", auth.currentUser.uid),
        where("role", "==", role)
      );
      const snapshot = await getDocs(q);
      const cloudTasks: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cloudTasks.push({
          id: docSnap.id,
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          priority: data.priority,
          completed: data.completed,
          role: data.role,
          subtasks: data.subtasks || [],
          createdAt: data.createdAt
        });
      });
      // Store in LocalStorage too as backup
      localStorage.setItem(LOCAL_KEYS.TASKS, JSON.stringify(cloudTasks));
      return cloudTasks;
    } catch (e) {
      console.error("Firestore fetch tasks failed, falling back to local:", e);
    }
  }

  // Local storage fallback
  const cached = localStorage.getItem(LOCAL_KEYS.TASKS);
  if (cached) {
    const allTasks: Task[] = JSON.parse(cached);
    return allTasks.filter(t => t.role === role);
  } else {
    // Populate with default template tasks if completely empty
    localStorage.setItem(LOCAL_KEYS.TASKS, JSON.stringify(DEFAULT_TASKS));
    return DEFAULT_TASKS.filter(t => t.role === role);
  }
}

export async function saveTask(task: Task): Promise<void> {
  // Update local storage
  const cached = localStorage.getItem(LOCAL_KEYS.TASKS);
  let allTasks: Task[] = cached ? JSON.parse(cached) : [];
  const idx = allTasks.findIndex(t => t.id === task.id);
  if (idx > -1) {
    allTasks[idx] = task;
  } else {
    allTasks.push(task);
  }
  localStorage.setItem(LOCAL_KEYS.TASKS, JSON.stringify(allTasks));

  // Sync to Firestore if online
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      await setDoc(doc(db, "tasks", task.id), {
        ...task,
        userId: auth.currentUser.uid
      });
    } catch (e) {
      console.error("Firestore save task failed:", e);
    }
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  // Update local
  const cached = localStorage.getItem(LOCAL_KEYS.TASKS);
  if (cached) {
    let allTasks: Task[] = JSON.parse(cached);
    allTasks = allTasks.filter(t => t.id !== taskId);
    localStorage.setItem(LOCAL_KEYS.TASKS, JSON.stringify(allTasks));
  }

  // Delete from Firestore
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
    } catch (e) {
      console.error("Firestore delete task failed:", e);
    }
  }
}

export async function saveDailyPlan(plan: DailyPlan): Promise<void> {
  localStorage.setItem(LOCAL_KEYS.PLAN, JSON.stringify(plan));
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      await setDoc(doc(db, "dailyPlans", auth.currentUser.uid), plan);
    } catch (e) {
      console.error("Firestore plan save failed:", e);
    }
  }
}

export function getDailyPlanSync(): DailyPlan | null {
  const cached = localStorage.getItem(LOCAL_KEYS.PLAN);
  return cached ? JSON.parse(cached) : null;
}

export async function saveOverloadStatus(status: OverloadStatus): Promise<void> {
  localStorage.setItem(LOCAL_KEYS.OVERLOAD, JSON.stringify(status));
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      await setDoc(doc(db, "overloadStatus", auth.currentUser.uid), status);
    } catch (e) {
      console.error("Firestore overload save failed:", e);
    }
  }
}

export function getOverloadStatusSync(): OverloadStatus | null {
  const cached = localStorage.getItem(LOCAL_KEYS.OVERLOAD);
  return cached ? JSON.parse(cached) : null;
}

export async function saveChatHistory(history: ChatMessage[]): Promise<void> {
  localStorage.setItem(LOCAL_KEYS.CHAT, JSON.stringify(history));
  if (isFirebaseConfigured && auth?.currentUser) {
    try {
      await setDoc(doc(db, "chats", auth.currentUser.uid), { messages: history });
    } catch (e) {
      console.error("Firestore chat save failed:", e);
    }
  }
}

export function getChatHistorySync(): ChatMessage[] {
  const cached = localStorage.getItem(LOCAL_KEYS.CHAT);
  return cached ? JSON.parse(cached) : [];
}
