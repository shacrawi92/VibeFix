import { GoogleGenAI, Type, Schema, Part } from "@google/genai";
import { BugReport, ChatEntry } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<Part> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      
      if (!result) {
        reject(new Error("Failed to read file"));
        return;
      }

      // Ensure we get just the base64 part
      const base64String = result.includes(',') ? result.split(',')[1] : result;
      
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type || 'video/mp4',
        },
      });
    };
    reader.onerror = (error) => reject(new Error("File reading failed: " + error));
    reader.readAsDataURL(file);
  });
};

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    bug_summary: {
      type: Type.STRING,
      description: "One sentence description of the bug.",
    },
    user_sentiment: {
      type: Type.STRING,
      description: "Frustrated/Confused/Helpful",
    },
    file_to_edit: {
      type: Type.STRING,
      description: "The path of the file that needs editing.",
    },
    explanation: {
      type: Type.STRING,
      description: "Conversational explanation of the fix. If this is a refinement, respond directly to the user's feedback.",
    },
    code_patch: {
      type: Type.STRING,
      description: "The corrected code snippet.",
    },
  },
  required: ["bug_summary", "user_sentiment", "file_to_edit", "explanation", "code_patch"],
};

const SYSTEM_INSTRUCTION = `
# Role
You are VibeFix, a Senior Full-Stack Engineer and UI/UX Specialist. You possess the ability to perceive code, visual bugs, and user frustration simultaneously.

# Task
Your goal is to analyze a software bug. You may receive a screen recording, source code, or both.
1. If a video is provided: Analyze the visual glitch or functional error and cross-reference it with the code.
2. If only code is provided: Analyze the code for logic errors, styling mistakes, or common pitfalls.

You must also engage in a refinement loop if the user provides feedback.

# Inputs Provided
1. **Video:** (Optional) A screen recording showing the visual glitch.
2. **Codebase:** A subset of the project's source code.
3. **Chat History:** Previous context of the fix and user feedback.

# Reasoning Steps (Internal Monologue)
1. **Analysis:** Identify the issue. If video exists, use it to pinpoint the UI element. If not, scan code for obvious defects.
2. **Audio/Intent Correlation:** (If video exists) Understand what the user wants.
3. **Code Triangulation:** Locate the file and line number.
4. **Refinement:** If the user gives feedback, adjust the code patch accordingly.

# Output Format
Return ONLY a JSON object matching the schema provided.
`;

export const analyzeBug = async (videoFile: File | null, codeContext: string, history: ChatEntry[]): Promise<BugReport> => {
  // Support both variable names for flexibility
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const parts: (Part | { text: string })[] = [];

  if (videoFile) {
    const videoPart = await fileToGenerativePart(videoFile);
    parts.push(videoPart);
  }

  let promptText = `
  Here is the relevant source code:
  \`\`\`
  ${codeContext}
  \`\`\`
  `;

  if (!videoFile) {
    promptText += "\nNo video was provided. Please analyze this code for bugs, logic errors, or styling issues.";
  } else {
    promptText += "\nPlease analyze the attached video and this code to find the bug and provide a fix.";
  }

  // Incorporate history for refinement context
  if (history.length > 0) {
    promptText += "\n\n--- Conversation History ---\n";
    history.forEach(entry => {
      // Avoid sending the base64 video again in text history, just the text content
      if (entry.role === 'user' && typeof entry.content === 'string') {
        promptText += `User: ${entry.content}\n`;
      } else if (entry.role === 'model') {
        const contentStr = typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content);
        promptText += `VibeFix: ${contentStr}\n`;
      }
    });
    promptText += "\n\nUser's Latest Feedback: Please refine the fix based on the above history.";
  }

  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: parts
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from Gemini.");

    return JSON.parse(resultText) as BugReport;
    
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze bug. Please check your API key and try again.");
  }
};
