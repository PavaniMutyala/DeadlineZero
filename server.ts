import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client to prevent crashes if key is missing on start
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add it to your secrets or environment variables.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Task Breakdown Endpoint
app.post("/api/gemini/breakdown", async (req, res) => {
  try {
    const { title, description, role } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are an elite productivity agent. Take this task and break it down into 3-5 logical, actionable, and incremental subtasks. Each subtask must have a realistic time estimate in minutes.
Task Title: "${title}"
Task Description: "${description || "No description provided"}"
User Role: "${role || "Student"}"

Format the response strictly as a JSON array of objects, where each object has "title" and "estimatedMinutes" fields. No markdown formatting or explanation outside of the valid JSON structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of broken down subtasks",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "A highly actionable, short subtask description" },
              estimatedMinutes: { type: Type.INTEGER, description: "Realistic time in minutes to complete this subtask" }
            },
            required: ["title", "estimatedMinutes"]
          }
        }
      }
    });

    const text = response.text || "[]";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/gemini/breakdown:", error);
    res.status(500).json({ error: error.message || "Failed to break down task" });
  }
});

// 2. Prioritization Engine Endpoint
app.post("/api/gemini/prioritize", async (req, res) => {
  try {
    const { tasks, role } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.json({ rankedTaskIds: [], dailyPlanSummary: "No active tasks to prioritize! Enjoy your clear schedule.", coreFocus: "Relaxation" });
    }

    const ai = getGeminiClient();

    const tasksString = JSON.stringify(tasks.map(t => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      priority: t.priority,
      completed: t.completed,
      subtasksCount: t.subtasks?.length || 0,
      subtasksCompleted: t.subtasks?.filter((s: any) => s.completed).length || 0
    })));

    const prompt = `You are DeadlineZero's agentic prioritization engine. Analyze the following list of active tasks for a ${role || "Student"} and formulate a daily action plan.
Ranking criteria:
- Urgency (deadline proximity)
- Effort/Complexity
- Explicit priority setting (🔴 Critical, 🟡 Soon, 🟢 Okay)

Tasks Data:
${tasksString}

Produce a prioritized daily plan. Respond with:
1. rankedTaskIds: An array of IDs from the input tasks, ordered from highest priority/action item to lowest.
2. dailyPlanSummary: A short, motivating, and action-oriented plan summary (2-3 sentences) detailing how the user should attack their day.
3. coreFocus: A single primary theme or project that is the absolute "must-win" focus for today.

Format strictly as a JSON object matching this schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rankedTaskIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Input task IDs ordered from highest priority/urgency to lowest."
            },
            dailyPlanSummary: { type: Type.STRING, description: "Action-oriented summary of the daily plan" },
            coreFocus: { type: Type.STRING, description: "The single most important task or topic for today" }
          },
          required: ["rankedTaskIds", "dailyPlanSummary", "coreFocus"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/gemini/prioritize:", error);
    res.status(500).json({ error: error.message || "Failed to prioritize tasks" });
  }
});

// 3. Overload Detector Endpoint
app.post("/api/gemini/overload", async (req, res) => {
  try {
    const { tasks, role } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.json({ isOverloaded: false, alertMessage: "Your workload is currently light and manageable. Keep it up!", suggestions: [] });
    }

    const ai = getGeminiClient();

    const tasksString = JSON.stringify(tasks.map(t => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline,
      priority: t.priority,
      completed: t.completed
    })));

    const prompt = `You are DeadlineZero's Workload Overload Detector. Assess the user's workload as a ${role || "Student"}.
Analyze their active tasks and deadlines. If there are multiple critical/soon deadlines stacked closely together, flag it as overloaded and suggest clear, actionable changes (reschedule, delegate, or break into tiny stages).

Current Tasks:
${tasksString}

Provide feedback strictly as a JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isOverloaded: { type: Type.BOOLEAN, description: "True if user has too many critical deadlines stacked within a 48h-72h window" },
            alertMessage: { type: Type.STRING, description: "An eye-opening yet supportive alert message explaining the bottleneck" },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING, description: "ID of the task to modify" },
                  action: { type: Type.STRING, description: "Action to take (e.g., 'Reschedule', 'Delegate', 'Defer', 'Focus First')" },
                  justification: { type: Type.STRING, description: "Clear reasoning for why this action mitigates the overload" }
                },
                required: ["taskId", "action", "justification"]
              },
              description: "Specific actions to alleviate pressure"
            }
          },
          required: ["isOverloaded", "alertMessage", "suggestions"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/gemini/overload:", error);
    res.status(500).json({ error: error.message || "Failed to detect workload overload" });
  }
});

// 4. Role-Aware AI Nudges Endpoint
app.post("/api/gemini/nudge", async (req, res) => {
  try {
    const { tasks, role } = req.body;
    const ai = getGeminiClient();

    const tasksString = JSON.stringify((tasks || []).map((t: any) => ({
      title: t.title,
      deadline: t.deadline,
      completed: t.completed,
      priority: t.priority
    })));

    const prompt = `You are a productivity coach generating action-oriented, hyper-personalized nudges for a ${role || "Student"} based on their task list.
Create exactly 2 role-specific high-impact nudges.
For example:
- "Assignemnt Due Soon: You have an exam in 2 days and haven't started — here's a 3-hour study plan"
- "Deliverable Block: Your client report is due. Send a status draft to get feedback today."

Tasks list:
${tasksString}

Respond strictly with a JSON array of 2 objects containing "title", "content", "actionLabel", and "type" ("warning", "tip", "info").`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Catchy, role-aware title of the nudge" },
              content: { type: Type.STRING, description: "Practical, action-oriented study/focus advice" },
              actionLabel: { type: Type.STRING, description: "Short call to action button text (e.g., 'Draft Email', 'Start Focus')" },
              type: { type: Type.STRING, enum: ["warning", "tip", "info"], description: "Type of message styling" }
            },
            required: ["title", "content", "actionLabel", "type"]
          }
        }
      }
    });

    const text = response.text || "[]";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/gemini/nudge:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI nudges" });
  }
});

// 5. Auto Draft Assistant Endpoint
app.post("/api/gemini/draft", async (req, res) => {
  try {
    const { title, deadline, role } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are DeadlineZero's Auto Draft Assistant. Create a quick, highly professional draft communication (email snippet or team message) for a ${role || "Professional"}.
Context:
- Task: "${title}"
- Deadline: "${deadline}"
Goal: Provide an update, request feedback, or draft notes to prevent last-minute blockages.

Format response strictly as a JSON object containing "subject" and "body". No markdown or outside text.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "Draft email subject line or message title" },
            body: { type: Type.STRING, description: "Fully formatted body text with placeholder tags" }
          },
          required: ["subject", "body"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/gemini/draft:", error);
    res.status(500).json({ error: error.message || "Failed to generate draft" });
  }
});

// 6. Interactive AI Chat Assistant Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, currentTasks, role } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are DeadlineZero's built-in productivity mentor. You help ${role || "Student"}s and professionals beat procrastination and plan smart schedules.
You have absolute context of their current tasks:
${JSON.stringify((currentTasks || []).map((t: any) => ({ title: t.title, deadline: t.deadline, priority: t.priority, completed: t.completed })))}

Be encouraging, structural, highly action-focused, and concise. Avoid vague advice; give hourly schedules, prioritization tips, or auto drafts when requested. Keep formatting clean with standard Markdown.`;

    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction
      }
    });

    res.json({ content: response.text || "I'm here to support you. Let's tackle that list!" });
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    res.status(500).json({ error: error.message || "Failed to generate chat response" });
  }
});

// 7. Natural Language Task Parsing Endpoint for the AI Calendar
app.post("/api/gemini/parse-task", async (req, res) => {
  try {
    const { query: userQuery, role, currentDate } = req.body;
    const ai = getGeminiClient();

    const prompt = `You are a scheduling AI. Parse the following natural language task request: "${userQuery}".
The user's current role is: "${role || "Student"}".
The reference current date is: "${currentDate || "2026-06-30"}".

Identify and extract:
1. "title": A clear, action-oriented title of the task.
2. "description": Brief context or summary if mentioned (otherwise generate a short helpful summary of what's expected for this kind of task).
3. "deadline": Calculate the target date string in "YYYY-MM-DD" format relative to the reference current date. (For example, if reference is 2026-06-30 and user says "next Friday", calculate the exact Friday. If they say "tomorrow", add 1 day. If they say "in 3 days", add 3 days. Ensure the year remains correct).
4. "priority": Classify as either "Critical" (if they say urgent, important, critical, must-do, or if it has a extremely tight deadline), "Soon" (medium priority or mid-term), or "Okay" (low priority/routine task).
5. "role": Assign to either "Student" or "Professional" based on the task description or user's current role if not explicit.
6. "subtasks": Generate 2-4 highly practical step-by-step subtasks with time estimates "estimatedMinutes" to serve as an instant action roadmap.

Respond strictly with a JSON object.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A highly concise, clean title of the task" },
            description: { type: Type.STRING, description: "Detailed description of the task requirements" },
            deadline: { type: Type.STRING, description: "Calculated date of the task in YYYY-MM-DD format" },
            priority: { type: Type.STRING, enum: ["Critical", "Soon", "Okay"], description: "Urgency ranking of the task" },
            role: { type: Type.STRING, enum: ["Student", "Professional"], description: "Role category for the task" },
            subtasks: {
              type: Type.ARRAY,
              description: "List of actionable subtasks for this task",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Action step" },
                  estimatedMinutes: { type: Type.INTEGER, description: "Estimated completion time in minutes" }
                },
                required: ["title", "estimatedMinutes"]
              }
            }
          },
          required: ["title", "description", "deadline", "priority", "role", "subtasks"]
        }
      }
    });

    const text = response.text || "{}";
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/gemini/parse-task:", error);
    res.status(500).json({ error: error.message || "Failed to parse natural language task" });
  }
});

// Setup Vite middleware / Static Asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[DeadlineZero Backend] Server running on port ${PORT}`);
  });
}

startServer();
