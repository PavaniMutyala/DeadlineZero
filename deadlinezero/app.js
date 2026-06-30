/**
 * DeadlineZero — Pure Standalone Javascript Client Engine
 * Handles State, LocalStorage, Calendars, and direct Gemini AI Fetch Calls.
 */

// ═══════════════════════════════════════
// ⚙️ CONFIGURATION BLOCK
// ═══════════════════════════════════════
const CONFIG = {
  // Substitutes are automatically injected from environment or set here
  GEMINI_API_KEY: "MY_GEMINI_API_KEY", 
  
  // Firebase client configuration parameters
  FIREBASE: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};

// ═══════════════════════════════════════
// 📂 APP STATE STORAGE KEYS
// ═══════════════════════════════════════
const KEYS = {
  TASKS: "deadlinezero_tasks",
  ROLE: "deadlinezero_role",
  NAME: "deadlinezero_name",
  CHAT: "deadlinezero_chat",
  PLAN: "deadlinezero_plan",
  OVERLOAD: "deadlinezero_overload"
};

// Global variables
let tasks = [];
let userRole = "Student";
let userName = "";
let currentMonth = new Date();
let chatHistory = [];
let dailyPlan = null;
let overloadStatus = null;
let generatedSubtasksPreview = []; // holds temporary subtasks during task creation

// Standard template roadmaps loaded on first start
const TEMPLATE_TASKS = [
  {
    id: "task-1",
    title: "Complete Chemistry Lab Report",
    description: "Write up findings on gas laws, include chemical equations and graph of volume vs. temperature.",
    deadline: new Date(Date.now() + 86400000 * 1.5).toISOString().split("T")[0],
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
    deadline: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
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

// ═══════════════════════════════════════
// 🚀 INITIATION AND ROUTING
// ═══════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  loadStoredProfile();
  setupEventListeners();
  renderApp();
});

function loadStoredProfile() {
  userName = localStorage.getItem(KEYS.NAME) || "";
  userRole = localStorage.getItem(KEYS.ROLE) || "Student";
  
  if (userName) {
    document.getElementById("onboarding-screen").classList.add("hidden");
    document.getElementById("app-container").classList.remove("hidden");
    
    document.getElementById("user-display-name").textContent = userName;
    document.getElementById("user-avatar").textContent = userName.substring(0, 2);
    document.getElementById("user-display-role").textContent = userRole + " Workspace";

    // load correct lists
    loadTasks();
  }
}

function setupEventListeners() {
  // Onboarding submissions
  document.getElementById("onboarding-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const nameInput = document.getElementById("onboarding-name").value.trim();
    if (!nameInput) return;

    userName = nameInput;
    localStorage.setItem(KEYS.NAME, userName);
    localStorage.setItem(KEYS.ROLE, userRole);

    loadStoredProfile();
  });

  // Role selections on Onboarding
  document.getElementById("role-student-btn").addEventListener("click", () => {
    userRole = "Student";
    document.getElementById("role-student-btn").className = "py-3 rounded-xl border font-semibold text-sm transition-all bg-slate-900 text-white border-slate-900";
    document.getElementById("role-prof-btn").className = "py-3 rounded-xl border font-semibold text-sm transition-all bg-white text-slate-600 border-slate-200 hover:bg-slate-50";
  });

  document.getElementById("role-prof-btn").addEventListener("click", () => {
    userRole = "Professional";
    document.getElementById("role-prof-btn").className = "py-3 rounded-xl border font-semibold text-sm transition-all bg-slate-900 text-white border-slate-900";
    document.getElementById("role-student-btn").className = "py-3 rounded-xl border font-semibold text-sm transition-all bg-white text-slate-600 border-slate-200 hover:bg-slate-50";
  });

  // Chat submission
  document.getElementById("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    submitChatMessage();
  });
}

function loadTasks() {
  const cached = localStorage.getItem(KEYS.TASKS);
  if (cached) {
    tasks = JSON.parse(cached);
  } else {
    tasks = TEMPLATE_TASKS;
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  }
  
  // Load AI summaries
  const planCached = localStorage.getItem(KEYS.PLAN);
  if (planCached) dailyPlan = JSON.parse(planCached);

  const overloadCached = localStorage.getItem(KEYS.OVERLOAD);
  if (overloadCached) overloadStatus = JSON.parse(overloadCached);

  const chatCached = localStorage.getItem(KEYS.CHAT);
  chatHistory = chatCached ? JSON.parse(chatCached) : [];

  renderApp();
}

function renderApp() {
  renderTasksList();
  renderCalendar();
  renderAIPlan();
  renderChatHistory();
  updateStatsHeader();
}

// ═══════════════════════════════════════
// 🖥️ UI SCREEN RENDERERS
// ═══════════════════════════════════════
function renderTasksList() {
  const activeTasks = tasks.filter(t => t.role === userRole);
  
  // 1. Render Dashboard list (Prioritized)
  const dashboardGrid = document.getElementById("dashboard-tasks-grid");
  dashboardGrid.innerHTML = "";
  
  // Sort prioritized if dailyPlan exists
  let sortedTasks = [...activeTasks];
  if (dailyPlan && dailyPlan.rankedTaskIds && dailyPlan.rankedTaskIds.length > 0) {
    const ordered = [];
    const rest = [];
    sortedTasks.forEach(t => {
      if (dailyPlan.rankedTaskIds.includes(t.id)) {
        ordered[dailyPlan.rankedTaskIds.indexOf(t.id)] = t;
      } else {
        rest.push(t);
      }
    });
    sortedTasks = [...ordered.filter(Boolean), ...rest];
  }

  if (sortedTasks.length === 0) {
    dashboardGrid.innerHTML = `
      <div class="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-100 p-8">
        <p class="text-xs text-slate-400">No roadmaps active in your workspace. Add one to start.</p>
      </div>`;
  } else {
    sortedTasks.forEach(t => {
      dashboardGrid.appendChild(createTaskCardElement(t));
    });
  }

  // 2. Render Roadmaps list
  const allGrid = document.getElementById("all-tasks-grid");
  allGrid.innerHTML = "";
  if (activeTasks.length === 0) {
    allGrid.innerHTML = `<p class="text-xs text-slate-400 text-center py-6">No tasks added yet.</p>`;
  } else {
    activeTasks.forEach(t => {
      allGrid.appendChild(createTaskCardElement(t));
    });
  }
}

function createTaskCardElement(task) {
  const card = document.createElement("div");
  const isOverdue = new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0)) && !task.completed;
  
  card.className = `bg-white border rounded-xl shadow-sm transition-all duration-300 hover:shadow-md p-5 flex flex-col justify-between ${
    task.completed ? "border-green-100 bg-green-50/10" : isOverdue ? "border-red-200 bg-red-50/5" : "border-slate-100"
  }`;

  const totalSubtasks = task.subtasks.length;
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (task.completed ? 100 : 0);

  const cleanDate = task.deadline.replace(/-/g, "");
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    "[DeadlineZero] " + task.title
  )}&dates=${cleanDate}/${cleanDate}&details=${encodeURIComponent(
    task.description || "DeadlineZero Sync"
  )}&sf=true&output=xml`;

  card.innerHTML = `
    <div>
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-2.5">
          <button onclick="toggleTaskComplete('${task.id}')" class="mt-1 text-slate-400 hover:text-emerald-600 transition-colors">
            ${task.completed ? '<i data-lucide="check-square" class="w-5 h-5 text-emerald-600"></i>' : '<i data-lucide="square" class="w-5 h-5"></i>'}
          </button>
          <div>
            <h3 class="font-semibold text-slate-800 ${task.completed ? 'line-through text-slate-400' : ''}">${task.title}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">${task.description || ''}</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-1.5 shrink-0">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full border ${
            task.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' : task.priority === 'Soon' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'
          }">${task.priority}</span>
          <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i>${task.deadline}</span>
        </div>
      </div>

      <!-- Roadmap subtasks collapse option -->
      ${totalSubtasks > 0 ? `
        <div class="mt-4 border-t border-slate-50 pt-3 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
            <span>Roadmap Steps</span>
            <span>${completedSubtasks}/${totalSubtasks} (${progressPercent}%)</span>
          </div>
          <div class="w-full bg-slate-100 rounded-full h-1 overflow-hidden mb-2">
            <div class="h-full bg-indigo-500 transition-all duration-300" style="width: ${progressPercent}%"></div>
          </div>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            ${task.subtasks.map(s => `
              <div class="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-xs">
                <div class="flex items-center gap-2">
                  <button onclick="toggleSubtaskComplete('${task.id}', '${s.id}')" class="text-slate-400 hover:text-emerald-600">
                    ${s.completed ? '<i data-lucide="check-square" class="w-4 h-4 text-emerald-600"></i>' : '<i data-lucide="square" class="w-4 h-4"></i>'}
                  </button>
                  <span class="${s.completed ? 'line-through text-slate-400' : 'text-slate-600'}">${s.title}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-400">${s.estimatedMinutes}m</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Quick action links -->
    <div class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
      <div class="flex items-center gap-1">
        <button onclick="askAICoachTask('${task.id}')" class="text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-lg flex items-center gap-1">
          <i data-lucide="sparkles" class="w-3 h-3"></i><span>AI Assist</span>
        </button>
        ${task.role === 'Professional' ? `
          <button onclick="generateDraftForTask('${task.id}')" class="text-[11px] font-semibold text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded-lg flex items-center gap-1">
            <i data-lucide="file-text" class="w-3 h-3"></i><span>Draft Msg</span>
          </button>
        ` : ''}
        <a href="${calendarUrl}" target="_blank" class="text-[11px] font-semibold text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded-lg flex items-center gap-1">
          <i data-lucide="calendar-plus" class="w-3 h-3"></i><span>Sync Calendar</span>
        </a>
      </div>

      <button onclick="deleteTaskItem('${task.id}')" class="text-slate-400 hover:text-red-500 p-1 rounded-md">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  `;

  setTimeout(() => lucide.createIcons({ attrs: { "data-lucide": true } }), 10);
  return card;
}

// ═══════════════════════════════════════
// 🤖 DIRECT GEMINI API CALL HANDLERS
// ═══════════════════════════════════════
async function callGemini(contents, responseMimeType = null, responseSchema = null) {
  if (CONFIG.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || !CONFIG.GEMINI_API_KEY) {
    throw new Error("No Gemini API key supplied. Please configure the CONFIG.GEMINI_API_KEY setting on top of app.js.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: contents }] }]
  };

  if (responseMimeType) {
    payload.generationConfig = {
      responseMimeType: responseMimeType
    };
    if (responseSchema) {
      payload.generationConfig.responseSchema = responseSchema;
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini Call Error: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text;
}

// 1. Break down subtasks
async function generateAISubtasks() {
  const title = document.getElementById("task-title-input").value.trim();
  const desc = document.getElementById("task-desc-input").value.trim();
  const previewContainer = document.getElementById("ai-subtasks-preview");

  if (!title) {
    alert("Please enter a title first!");
    return;
  }

  previewContainer.innerHTML = `<p class="text-xs text-indigo-600 flex items-center gap-1.5"><i data-lucide="refresh-cw" class="w-3 h-3 animate-spin"></i><span>Gemini breaking task down...</span></p>`;
  lucide.createIcons();

  try {
    const prompt = `Break down the task "${title}" (${desc || 'no description'}) for a ${userRole} into 3-5 incremental actionable subtasks. Each must have "title" and "estimatedMinutes". Format strictly as a valid JSON array, do not add markdown codeblocks.`;
    const jsonStr = await callGemini(prompt, "application/json");
    const steps = JSON.parse(jsonStr);

    generatedSubtasksPreview = steps.map((s, i) => ({
      id: `ai-sub-${Date.now()}-${i}`,
      title: s.title || "Study section",
      estimatedMinutes: s.estimatedMinutes || 30,
      completed: false
    }));

    previewContainer.innerHTML = "";
    generatedSubtasksPreview.forEach(s => {
      const stepEl = document.createElement("div");
      stepEl.className = "flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-100 text-xs";
      stepEl.innerHTML = `
        <span class="font-medium text-slate-700">${s.title}</span>
        <span class="font-mono text-slate-400 text-[10px] flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i>${s.estimatedMinutes}m</span>
      `;
      previewContainer.appendChild(stepEl);
    });
    lucide.createIcons();
  } catch (e) {
    console.error(e);
    previewContainer.innerHTML = `<p class="text-xs text-red-500">AI Breakdown failed. You can proceed to add task without steps.</p>`;
  }
}

// 2. Prioritization Engine & Overload Detector
async function runAIEngines() {
  const activeTasks = tasks.filter(t => t.role === userRole && !t.completed);
  if (activeTasks.length === 0) return;

  try {
    // A. Prioritization Plan
    const promptPlan = `You are DeadlineZero's Prioritizer. Analyze these tasks: ${JSON.stringify(activeTasks)}. Organize them into a ranked list of task ids from highest action item to lowest. Provide "rankedTaskIds", a general 2-sentence tactical daily advice "dailyPlanSummary", and a single "coreFocus" theme for today. Return as JSON.`;
    const planStr = await callGemini(promptPlan, "application/json");
    dailyPlan = JSON.parse(planStr);
    localStorage.setItem(KEYS.PLAN, JSON.stringify(dailyPlan));

    // B. Overload Status
    const promptOverload = `Analyze workload: ${JSON.stringify(activeTasks)}. Detect if deadlines are bottlenecked. Provide JSON with "isOverloaded" (boolean), "alertMessage" (supporting analysis), and "suggestions" (array of object with "taskId", "action" e.g. reschedule/delegate, and "justification").`;
    const overloadStr = await callGemini(promptOverload, "application/json");
    overloadStatus = JSON.parse(overloadStr);
    localStorage.setItem(KEYS.OVERLOAD, JSON.stringify(overloadStatus));

    // C. Dynamic Nudges
    const promptNudges = `Generate exactly 2 short coaching nudges for a ${userRole} based on current tasks: ${JSON.stringify(activeTasks)}. Respond as JSON array of objects with "title", "content", "actionLabel", and "type" ("warning", "tip", "info").`;
    const nudgesStr = await callGemini(promptNudges, "application/json");
    const nudges = JSON.parse(nudgesStr);
    renderNudges(nudges);

    renderApp();
  } catch (e) {
    console.error("AI engines failed: ", e);
  }
}

// 3. Status/Email Draft generator
async function generateDraftForTask(taskId) {
  const t = tasks.find(item => item.id === taskId);
  if (!t) return;

  document.getElementById("draft-modal").classList.remove("hidden");
  document.getElementById("draft-body").innerHTML = `<span class="text-slate-400">Gemini drafting communication update...</span>`;

  try {
    const prompt = `Draft a brief professional update message or email for: "${t.title}". Respond as JSON with "subject" and "body".`;
    const jsonStr = await callGemini(prompt, "application/json");
    const draft = JSON.parse(jsonStr);

    document.getElementById("draft-subject").innerText = draft.subject;
    document.getElementById("draft-body").innerText = draft.body;
  } catch (e) {
    document.getElementById("draft-body").innerText = "Failed to generate draft. Please verify your API Key settings.";
  }
}

// 4. Interactive Chat
async function submitChatMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  appendChatMessage("user", text);
  input.value = "";

  appendChatMessage("assistant", "Thinking...");

  try {
    const prompt = `Context tasks: ${JSON.stringify(tasks.filter(t => t.role === userRole))}. User asks: "${text}". Give brief, structural, and hyper-actionable tactical advice. Use Markdown lists where helpful.`;
    const reply = await callGemini(prompt);
    
    // Remove 'thinking' loading bubble and swap with response
    removeLastChatBubble();
    appendChatMessage("assistant", reply);
  } catch (e) {
    removeLastChatBubble();
    appendChatMessage("assistant", "My connectivity cortex is currently disconnected. Double check your Gemini API key inside app.js config.");
  }
}

// ═══════════════════════════════════════
// 🕒 EVENT HANDLERS & OPERATIONS
// ═══════════════════════════════════════
function toggleTaskComplete(id) {
  tasks = tasks.map(t => {
    if (t.id === id) {
      const isComp = !t.completed;
      return { ...t, completed: isComp, subtasks: t.subtasks.map(s => ({ ...s, completed: isComp })) };
    }
    return t;
  });
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  renderApp();
  runAIEngines();
}

function toggleSubtaskComplete(taskId, subId) {
  tasks = tasks.map(t => {
    if (t.id === taskId) {
      const updatedSubs = t.subtasks.map(s => s.id === subId ? { ...s, completed: !s.completed } : s);
      const allComp = updatedSubs.every(s => s.completed);
      return { ...t, subtasks: updatedSubs, completed: allComp };
    }
    return t;
  });
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  renderApp();
  runAIEngines();
}

function deleteTaskItem(id) {
  tasks = tasks.filter(t => t.id !== id);
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  renderApp();
  runAIEngines();
}

// ═══════════════════════════════════════
// 🏛️ INTERACTION CONTROLS
// ═══════════════════════════════════════
function switchTab(tabId) {
  const tabs = ["dashboard", "tasks", "calendar", "ai-plan"];
  tabs.forEach(t => {
    document.getElementById(`view-${t}`).classList.add("hidden");
    document.getElementById(`nav-${t}`).className = "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-800";
  });

  document.getElementById(`view-${tabId}`).classList.remove("hidden");
  document.getElementById(`nav-${tabId}`).className = "w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition-all bg-slate-900 text-white shadow-xs";

  // capitalize titles
  document.getElementById("workspace-title").textContent = 
    tabId === "dashboard" ? "Productivity Dashboard" : tabId === "tasks" ? "Active Roadmaps" : tabId === "calendar" ? "Visual Calendar" : "Gemini Action Plan";
}

function toggleRole(role) {
  userRole = role;
  localStorage.setItem(KEYS.ROLE, userRole);
  
  document.getElementById("toggle-role-student").className = role === "Student" ? "px-3 py-1 text-[11px] font-bold rounded-md transition-all bg-white text-slate-800 shadow-xs" : "px-3 py-1 text-[11px] font-bold rounded-md transition-all text-slate-500 hover:text-slate-700";
  document.getElementById("toggle-role-prof").className = role === "Professional" ? "px-3 py-1 text-[11px] font-bold rounded-md transition-all bg-white text-slate-800 shadow-xs" : "px-3 py-1 text-[11px] font-bold rounded-md transition-all text-slate-500 hover:text-slate-700";
  document.getElementById("user-display-role").textContent = userRole + " Workspace";

  renderApp();
  runAIEngines();
}

function openAddTaskModal() {
  document.getElementById("add-task-modal").classList.remove("hidden");
  document.getElementById("task-title-input").value = "";
  document.getElementById("task-desc-input").value = "";
  document.getElementById("ai-subtasks-preview").innerHTML = "";
  generatedSubtasksPreview = [];
}

function closeAddTaskModal() {
  document.getElementById("add-task-modal").classList.add("hidden");
}

function submitTaskForm() {
  const title = document.getElementById("task-title-input").value.trim();
  const desc = document.getElementById("task-desc-input").value.trim();
  const deadline = document.getElementById("task-deadline-input").value || new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const priority = document.getElementById("task-priority-input").value;

  if (!title) return;

  const newTask = {
    id: `task-${Date.now()}`,
    title,
    description: desc,
    deadline,
    priority,
    completed: false,
    role: userRole,
    subtasks: generatedSubtasksPreview,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  
  closeAddTaskModal();
  renderApp();
  runAIEngines();
}

// ═══════════════════════════════════════
// 📅 VISUAL CALENDAR ENGINE
// ═══════════════════════════════════════
function renderCalendar() {
  const container = document.getElementById("calendar-grid");
  if (!container) return;
  container.innerHTML = "";

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  document.getElementById("calendar-month-name").innerText = monthName;

  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  // Pad days
  for (let i = 0; i < firstDay; i++) {
    const pad = document.createElement("div");
    pad.className = "min-h-[100px] border border-slate-50 rounded-lg bg-slate-50/20";
    container.appendChild(pad);
  }

  // Monthly dates
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
    const dateStr = cellDate.toISOString().split("T")[0];
    const dayTasks = tasks.filter(t => t.deadline === dateStr && t.role === userRole);

    const isToday = new Date().toISOString().split("T")[0] === dateStr;

    const cell = document.createElement("div");
    cell.className = `min-h-[100px] p-2 border rounded-lg flex flex-col justify-between transition-colors hover:bg-slate-50/50 ${
      isToday ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-100'
    }`;

    cell.innerHTML = `
      <span class="text-xs font-bold text-slate-500 self-end">${d}</span>
      <div class="flex-1 mt-1.5 space-y-1 overflow-y-auto">
        ${dayTasks.map(t => `
          <div onclick="askAICoachTask('${t.id}')" class="px-1.5 py-0.5 text-[10px] font-bold rounded-md truncate cursor-pointer transition-all ${
            t.completed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-700'
          }">
            ${t.title}
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(cell);
  }
}

function navigateCalendar(dir) {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1);
  renderCalendar();
}

// ═══════════════════════════════════════
// 📋 STATS AND OTHER SMALL RENDERS
// ═══════════════════════════════════════
function updateStatsHeader() {
  const active = tasks.filter(t => t.role === userRole && !t.completed);
  const crit = active.filter(t => t.priority === "Critical").length;
  const soon = active.filter(t => t.priority === "Soon").length;
  const okay = active.filter(t => t.priority === "Okay").length;

  document.getElementById("stat-critical").innerText = crit;
  document.getElementById("stat-soon").innerText = soon;
  document.getElementById("stat-okay").innerText = okay;

  // Render Overload Banner
  const banner = document.getElementById("overload-banner");
  if (overloadStatus && overloadStatus.isOverloaded && active.length > 0) {
    banner.classList.remove("hidden");
    document.getElementById("overload-banner-msg").innerText = overloadStatus.alertMessage;
  } else {
    banner.classList.add("hidden");
  }
}

function renderAIPlan() {
  // A. Core Focus Theme Brief
  if (dailyPlan) {
    document.getElementById("brief-core-focus").innerText = "🎯 " + dailyPlan.coreFocus;
    document.getElementById("brief-plan-summary").innerText = dailyPlan.dailyPlanSummary;
    
    // B. Plan View Prioritization list
    const list = document.getElementById("plan-priorities-list");
    list.innerHTML = "";
    dailyPlan.rankedTaskIds.forEach((id, idx) => {
      const matched = tasks.find(t => t.id === id);
      if (matched) {
        const item = document.createElement("div");
        item.className = "p-3.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100/60 flex items-center justify-between gap-3 cursor-pointer";
        item.onclick = () => askAICoachTask(matched.id);
        item.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-[11px]">${idx+1}</span>
            <div>
              <h4 class="text-xs font-bold text-slate-800">${matched.title}</h4>
              <span class="text-[10px] text-slate-400 font-medium">Deadline: ${matched.deadline}</span>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${matched.priority === 'Critical' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-100'}">${matched.priority}</span>
        `;
        list.appendChild(item);
      }
    });
  }

  // C. Plan View Overload Health Card
  if (overloadStatus) {
    document.getElementById("plan-overload-title").innerText = overloadStatus.isOverloaded ? "🚨 Workload Status: Critical Overload!" : "✅ Workload Status: Healthy";
    document.getElementById("plan-overload-msg").innerText = overloadStatus.alertMessage;

    const suggContainer = document.getElementById("plan-overload-suggestions");
    suggContainer.innerHTML = "";
    if (overloadStatus.isOverloaded && overloadStatus.suggestions) {
      overloadStatus.suggestions.forEach(s => {
        const tRef = tasks.find(item => item.id === s.taskId);
        const card = document.createElement("div");
        card.className = "bg-white p-3 rounded-xl border border-red-100/60 shadow-sm space-y-1.5";
        card.innerHTML = `
          <span class="text-[9px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-sm uppercase">${s.action}</span>
          <h5 class="text-xs font-bold text-slate-800 truncate">${tRef ? tRef.title : 'Workspace deliverable'}</h5>
          <p class="text-[11px] text-slate-500 leading-normal">${s.justification}</p>
        `;
        suggContainer.appendChild(card);
      });
    }
  }
}

function renderNudges(nudgesList) {
  const container = document.getElementById("coaching-nudges-container");
  container.innerHTML = "";
  nudgesList.forEach(n => {
    const card = document.createElement("div");
    const style = n.type === 'warning' ? 'bg-rose-50/70 border-rose-100 text-rose-900' : 'bg-amber-50/70 border-amber-100 text-amber-900';
    card.className = `p-3 rounded-xl border text-xs leading-relaxed flex gap-2 ${style}`;
    card.innerHTML = `
      <div class="shrink-0"><i data-lucide="${n.type === 'warning' ? 'alert-triangle' : 'lightbulb'}" class="w-4 h-4 text-amber-500"></i></div>
      <div>
        <h4 class="font-bold mb-0.5">${n.title}</h4>
        <p class="opacity-90">${n.content}</p>
        <button onclick="askAICoachNudgeText('${n.content}')" class="mt-2 text-[10px] font-bold underline block">${n.actionLabel} →</button>
      </div>
    `;
    container.appendChild(card);
  });
  lucide.createIcons();
}

function renderChatHistory() {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";
  if (chatHistory.length === 0) {
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
        <div class="p-3 bg-indigo-50 rounded-2xl"><i data-lucide="bot" class="w-8 h-8 text-indigo-600"></i></div>
        <div>
          <h3 class="font-bold text-sm text-slate-800">Meet your AI Productivity Mentor</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-[220px]">Ask me for schedules or anti-procrastination plans!</p>
        </div>
      </div>`;
    lucide.createIcons();
  } else {
    chatHistory.forEach(m => {
      appendChatMessage(m.role, m.content, false);
    });
  }
}

function appendChatMessage(role, content, save = true) {
  const container = document.getElementById("chat-messages");
  const bubble = document.createElement("div");
  bubble.className = `flex items-start gap-2.5 max-w-[85%] ${role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`;
  
  bubble.innerHTML = `
    <div class="p-2 rounded-xl shrink-0 ${role === 'user' ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-indigo-600'}">
      <i data-lucide="${role === 'user' ? 'user' : 'bot'}" class="w-3.5 h-3.5"></i>
    </div>
    <div class="p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
      role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
    }">${content}</div>
  `;
  container.appendChild(bubble);
  lucide.createIcons();

  container.scrollTop = container.scrollHeight;

  if (save) {
    chatHistory.push({ role, content, timestamp: new Date().toLocaleTimeString() });
    localStorage.setItem(KEYS.CHAT, JSON.stringify(chatHistory));
  }
}

function removeLastChatBubble() {
  const container = document.getElementById("chat-messages");
  if (container.lastChild) container.removeChild(container.lastChild);
}

function askAICoachTask(id) {
  const t = tasks.find(item => item.id === id);
  if (!t) return;
  const prompt = `Plan a focus roadmap for task: "${t.title}" (deadline: ${t.deadline}, priority: ${t.priority}). Suggest exact hourly study blocks.`;
  appendChatMessage("user", prompt);
  submitChatMessage();
}

function askAICoachNudgeText(text) {
  appendChatMessage("user", text);
  submitChatMessage();
}

// Dialog controls
function closeDraftModal() { document.getElementById("draft-modal").classList.add("hidden"); }
function copyDraftToClipboard() {
  const text = document.getElementById("draft-body").innerText;
  navigator.clipboard.writeText(text);
  alert("Draft copied to clipboard!");
}
