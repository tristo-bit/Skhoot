
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { MOCK_FILES, MOCK_MESSAGES } from "../constants";

const findFileFunction: FunctionDeclaration = {
  name: 'findFile',
  parameters: {
    type: Type.OBJECT,
    description: 'Find a file on the user computer using natural language keywords.',
    properties: {
      query: { type: Type.STRING, description: 'File name or content keywords.' },
      category: { type: Type.STRING, description: 'Optional category filter like Work, System, Temp.' }
    },
    required: ['query'],
  },
};

const findMessageFunction: FunctionDeclaration = {
  name: 'findMessage',
  parameters: {
    type: Type.OBJECT,
    description: 'Find a conversation message from connected apps like Slack, Discord, or iMessage.',
    properties: {
      keywords: { type: Type.STRING, description: 'Keywords from the message content.' },
      app: { type: Type.STRING, description: 'Optional app filter.' }
    },
    required: ['keywords'],
  },
};

const analyzeDiskSpaceFunction: FunctionDeclaration = {
  name: 'analyzeDiskSpace',
  parameters: {
    type: Type.OBJECT,
    description: 'Analyze what is taking space on the computer.',
    properties: {},
  },
};

const checkFileSafetyFunction: FunctionDeclaration = {
  name: 'checkFileSafety',
  parameters: {
    type: Type.OBJECT,
    description: 'Check if a specific file or folder is safely removable.',
    properties: {
      filePath: { type: Type.STRING, description: 'The path of the file to check.' }
    },
    required: ['filePath'],
  },
};

const analyzeLogsFunction: FunctionDeclaration = {
  name: 'analyzeLogs',
  parameters: {
    type: Type.OBJECT,
    description: 'Find and analyze system logs or bug reports.',
    properties: {
      errorType: { type: Type.STRING, description: 'Optional error type or app name.' }
    },
  },
};

export const geminiService = {
  async chat(message: string, history: any[] = []) {
    // Creating a new GoogleGenAI instance inside the function to ensure up-to-date API key access
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: "You are Skhoot, a proactive desktop 'seeker' owl assistant. Your goal is to reduce cognitive load for the user. IMPORTANT: When a user explains they have lost something, are looking for a file/message, or are generally searching, YOUR FIRST REFLEX IS TO SEARCH IMMEDIATELY using the tools. Do NOT ask for more details or clarifications first. Infer the best search terms from the user's description and trigger the appropriate findFile or findMessage tool. Only talk after you have search results to show. Always be polite, modern, and concise.",
          tools: [{ functionDeclarations: [
            findFileFunction, 
            findMessageFunction, 
            analyzeDiskSpaceFunction, 
            checkFileSafetyFunction,
            analyzeLogsFunction
          ]}],
        },
      });

      // Handle case where response might be empty
      if (!response) {
        return { text: "I'm here to help! What can I assist you with?", type: 'text' };
      }

      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        const fc = functionCalls[0];
        let result: any = null;

        if (fc.name === 'findFile') {
          const q = (fc.args as any).query.toLowerCase();
          result = { type: 'file_list', data: MOCK_FILES.filter(f => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)) };
        } else if (fc.name === 'findMessage') {
          const q = (fc.args as any).keywords.toLowerCase();
          result = { type: 'message_list', data: MOCK_MESSAGES.filter(m => m.text.toLowerCase().includes(q) || m.user.toLowerCase().includes(q)) };
        } else if (fc.name === 'analyzeDiskSpace') {
          result = { type: 'disk_usage', data: [...MOCK_FILES].sort((a, b) => b.size.includes('GB') ? 1 : -1) };
        } else if (fc.name === 'checkFileSafety') {
          const path = (fc.args as any).filePath;
          const file = MOCK_FILES.find(f => f.path.includes(path) || f.name.includes(path));
          result = { type: 'analysis', content: file?.safeToRemove ? `The file "${file.name}" is a temporary file and can be safely removed.` : `I wouldn't recommend removing "${file?.name || path}". It appears to be a system or personal file.` };
        } else if (fc.name === 'analyzeLogs') {
          result = { type: 'analysis', content: "I've analyzed the kernel logs. It looks like a memory overflow occurred in the graphics driver on Jan 5th. Updating your GPU drivers might help." };
        }

        // Continuing the generation with tool response part including the function call id
        const finalResponse = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            ...history,
            { role: 'user', parts: [{ text: message }] },
            { role: 'model', parts: [{ functionCall: fc }] },
            { role: 'user', parts: [{ functionResponse: { id: fc.id, name: fc.name, response: { result } } }] }
          ]
        });

        return {
          text: finalResponse?.text || "Here's what I found.",
          type: result?.type || 'text',
          data: result?.data
        };
      }

      return { text: response.text || "I'm here! How can I help you?", type: 'text' };
    } catch (error) {
      console.error("Gemini Error:", error);
      return { text: "I'm sorry, I encountered an issue accessing your system index.", type: 'text' };
    }
  }
};
