import { GoogleGenAI, Type, Schema, Content, Part } from "@google/genai";
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
Your goal is to analyze a screen recording of a software bug, cross-reference it with the provided source code, and generate a specific fix. 
You must also engage in a refinement loop if the user provides feedback.

# Inputs Provided
1. **Video:** A screen recording showing the visual glitch or functional error.
2. **Codebase:** A subset of the project's source code.
3. **Chat History:** Previous context of the fix and user feedback.

# Reasoning Steps (Internal Monologue)
1. **Visual Analysis:** Identify the specific UI element causing the issue in the video.
2. **Audio/Intent Correlation:** Understand what the user wants (either from the video or their text feedback).
3. **Code Triangulation:** Locate the file and line number.
4. **Refinement:** If the user gives feedback (e.g., "Make it red"), update the previous fix to match their preference while maintaining correctness.
5. **Solution Generation:** Write the corrected code block.

# Tone
Professional, empathetic, and slightly "hacker-cool". Use emojis occasionally.
`;

export const analyzeBug = async (
  videoFile: File,
  codeContext: string,
  history: ChatEntry[] = []
): Promise<BugReport> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please check your environment configuration.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash";

    // 1. Prepare the video part
    const videoPart = await fileToGenerativePart(videoFile);
    
    // 2. Prepare the initial prompt part
    const initialPromptPart: Part = { 
      text: `
      Here is the relevant code snippet for the application shown in the video:
      \`\`\`
      ${codeContext}
      \`\`\`
      Analyze the video and the code to find the bug.
      ` 
    };

    // 3. Build the Content array for the chat
    const contents: Content[] = [];

    // Add the "Root" user message (Video + Code)
    // We explicitly structure this to ensure the SDK serializes it correctly
    contents.push({
      role: 'user',
      parts: [videoPart, initialPromptPart]
    });

    // 4. Append History
    // We skip the first user message in history because we just reconstructed it above with the video file.
    if (history.length > 0) {
      for (let i = 1; i < history.length; i++) {
        const entry = history[i];
        if (entry.role === 'model') {
           // The model's history is the JSON string of the report
           const contentStr = typeof entry.content === 'string' 
             ? entry.content 
             : JSON.stringify(entry.content);
             
           contents.push({
             role: 'model',
             parts: [{ text: contentStr }]
           });
        } else {
           contents.push({
             role: 'user',
             parts: [{ text: entry.content as string }]
           });
        }
      }
    }

    // 5. Generate Content
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    let responseText = response.text;
    if (!responseText) {
        throw new Error("No response received from Gemini.");
    }

    // Clean potential markdown code blocks if the model includes them despite JSON mode
    responseText = responseText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

    const bugReport: BugReport = JSON.parse(responseText);
    return bugReport;

  } catch (error) {
    console.error("Error analyzing bug:", error);
    throw error;
  }
};