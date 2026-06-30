# 🎯 DeadlineZero — Standalone Exportable Workspace

DeadlineZero is an agentic AI-powered productivity system built to defeat procrastination. It doesn't just list tasks; it automatically breaks them down into roadmaps, prioritizes daily tactical focuses, flags calendar bottlenecks, and drafts professional progress messages.

This directory is **fully self-contained** and can be run instantly offline, checked into GitHub, or deployed to Firebase Hosting with **zero build tools or complex configurations**.

---

## 🚀 How to Run Locally

1. **Open the app**: Simply double-click `/deadlinezero/index.html` in any modern web browser.
2. **Instant Caching**: All tasks, chat logs, plans, and profiles persist immediately to browser `LocalStorage`.

---

## 🤖 Configuring Gemini AI Integrations

To activate the real-time AI Roadmap Generator, Daily Prioritizer, Overload Detector, and Communication Assistant, open `/deadlinezero/app.js` and edit the `CONFIG` block at the top:

```javascript
const CONFIG = {
  // 1. Paste your Gemini API Key here (or retrieve from AI Studio secrets)
  GEMINI_API_KEY: "YOUR_GEMINI_API_KEY", 
  
  // 2. Paste your Firebase web configuration credentials here
  FIREBASE: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  }
};
```

---

## ☁️ Direct Deploy to Firebase Hosting

To publish your workspace live on the web:

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize & link project**:
   Select your existing Firebase project ID:
   ```bash
   firebase use --add YOUR_FIREBASE_PROJECT_ID
   ```

4. **Deploy instantly**:
   ```bash
   firebase deploy --only hosting
   ```

---

## 🛠️ Architecture Overview

- **`index.html`**: Visual shell built using mobile-first Tailwind CSS, Google Fonts, and Lucide vector icons.
- **`style.css`**: Supplementary micro-animations, scrollbar styles, and hover-glow filters.
- **`app.js`**: Core state engine, local caching mechanism, Calendar render modules, and direct fetch connection pipelines to Gemini 2.0 Flash (`generativelanguage.googleapis.com`).
