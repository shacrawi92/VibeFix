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

// Retry helper with exponential backoff
async function generateWithRetry(
  ai: GoogleGenAI, 
  model: string, 
  contents: any, 
  config: any, 
  retries = 3
): Promise<any> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config
      });
    } catch (error: any) {
      lastError = error;
      const msg = error.message || '';
      // Check for quota (429) or server errors (5xx)
      // We also check for the specific quota string to be safe
      const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
      const isServer = msg.includes('503') || msg.includes('500');

      if ((isQuota || isServer) && i < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s... + jitter
        const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
        console.warn(`Attempt ${i + 1} for ${model} failed with ${isQuota ? 'Quota' : 'Server'} error. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // If it's not a retryable error or last attempt, throw
      throw error;
    }
  }
  throw lastError;
}

export const analyzeBug = async (
  videoFile: File | null, 
  codeContext: string, 
  history: ChatEntry[],
  modelName: string
): Promise<BugReport> => {
  // Exclusively use process.env.API_KEY as per guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is correctly configured.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const parts: (Part | { text: string })[] = [];

  if (videoFile) {
    try {
      const videoPart = await fileToGenerativePart(videoFile);
      parts.push(videoPart);
    } catch (e: any) {
      throw new Error(`Failed to process video file: ${e.message}`);
    }
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
  
  const contents = { parts };
  const config = {
    systemInstruction: SYSTEM_INSTRUCTION,
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA
  };

  try {
    let response;
    
    try {
      // Primary attempt with selected model
      response = await generateWithRetry(ai, modelName, contents, config);
    } catch (primaryError: any) {
      const msg = primaryError.message || '';
      // Fallback Logic: If Gemini 3 Pro fails with Quota Exceeded (429), try Gemini 2.5 Flash
      // Note: 2.5 Flash often has a separate or higher quota limit.
      if (modelName === 'gemini-3-pro-preview' && (msg.includes('429') || msg.toLowerCase().includes('quota'))) {
         console.warn("Gemini 3 Pro quota exceeded. Automatically falling back to Gemini 2.5 Flash.");
         try {
           response = await generateWithRetry(ai, 'gemini-2.5-flash', contents, config);
         } catch (fallbackError) {
           // If fallback also fails, throw the original error to avoid confusion, 
           // or throw fallback error. Usually original error is more relevant to user's choice.
           throw primaryError;
         }
      } else {
        throw primaryError;
      }
    }

    let resultText = response.text;
    if (!resultText) throw new Error("Received empty response from Gemini.");

    // Clean up potential Markdown code block wrappers which can cause JSON.parse to fail
    if (resultText.trim().startsWith('```')) {
      resultText = resultText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(resultText) as BugReport;
    
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    
    // Provide more specific error messages to help debugging
    let errorMessage = error.message || "Unknown error";
    
    if (errorMessage.includes("404")) {
      errorMessage += ` (Model '${modelName}' not found. Your API key might not have access to this model.)`;
    } else if (errorMessage.includes("400")) {
      errorMessage += " (Bad Request. Check if the video format is supported or if the input is too large.)";
    } else if (errorMessage.includes("403")) {
      errorMessage += " (Permission Denied. Check your API Key.)";
    } else if (errorMessage.includes("429") || errorMessage.toLowerCase().includes("quota")) {
      errorMessage += " (Quota Exceeded. Please try again later or switch to Gemini 2.5 Flash.)";
    } else if (error instanceof SyntaxError) {
      errorMessage = "Failed to parse JSON response from model. " + errorMessage;
    }

    throw new Error(errorMessage);
  }
};
