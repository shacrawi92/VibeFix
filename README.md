# VibeFix ⚡️

**"Stop writing Jira tickets. Just show Gemini the bug."**

VibeFix is an AI-powered debugging agent that fixes bugs by watching screen recordings. It analyzes the video (visuals), the audio (user intent), and the repository code simultaneously to output the exact CSS/JS fix.

## 🚀 The Workflow

VibeFix simplifies the debugging process by "vibe coding" — analyzing visual intent alongside code logic.

### 1. Inputs
*   **Video File:** A screen recording showing the bug. The user narrates the issue (e.g., "This button is invisible on mobile").
*   **Code Context:** A focused snippet of the repository (e.g., the component or CSS file) corresponding to the view.

### 2. The Analysis Process
We use **Gemini 2.5 Flash** (simulating Gemini 3 capabilities) via the Google AI Studio API. The model performs multimodal reasoning:
1.  **Visual Analysis:** Identifies the specific UI element causing the issue in the video at the timestamp the user points it out.
2.  **Audio Correlation:** Listens to the user's voice to gauge intent and sentiment.
3.  **Code Triangulation:** Locates the specific lines in the provided code snippet that control the defective UI element.
4.  **Solution Generation:** Writes the corrected code block to resolve the discrepancy between the visual output and the code logic.

### 3. System Instruction & JSON Output
The AI is prompted with a strict system instruction to act as a "Senior Full-Stack Engineer". It returns a structured JSON object:

```json
{
  "bug_summary": "One sentence description of the bug.",
  "user_sentiment": "Frustrated/Confused/Helpful",
  "file_to_edit": "src/components/Footer.js",
  "explanation": "The button has a fixed position that collides with the footer.",
  "code_patch": "Actual code snippet to replace the bad code."
}
```

## 🛠️ Tech Stack
*   **Frontend:** React, Tailwind CSS
*   **AI:** Google Gemini API (Multimodal Video + Text)
