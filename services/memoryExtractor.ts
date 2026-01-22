/**
 * Memory Auto-Extractor
 * Automatically extracts important information from conversations and saves as memories
 * Ported from AgentSmith's SmartAgent memory extraction logic
 */

import { memoryService, type CreateMemoryRequest } from './memoryService';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface MemoryExtractionOptions {
  sessionId: string | null;
  importance?: 'low' | 'medium' | 'high';
  autoSave?: boolean;
}

/**
 * Extract memories from a conversation using AI analysis
 */
export async function extractMemoriesFromConversation(
  messages: ConversationMessage[],
  options: MemoryExtractionOptions
): Promise<number> {
  const { sessionId, importance = 'medium', autoSave = false } = options;

  if (!autoSave) {
    return 0;
  }

  // Don't extract from very short conversations
  if (messages.length < 3) {
    return 0;
  }

  try {
    // Build conversation summary for AI analysis
    const conversation = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    // Create extraction prompt
    const extractionPrompt = `Analyze the following conversation and identify important information that should be remembered as long-term memory.

CONVERSATION:
${conversation}

INSTRUCTIONS:
Identify specific pieces of information that would be useful to remember for future conversations. These could include:
- User preferences and choices made
- Important decisions or agreements
- Technical decisions, architecture choices, or code patterns
- Project details, file paths, or configurations
- Context that might be relevant in future

Return a JSON array of memories in this exact format:
{
  "memories": [
    {
      "content": "The specific fact or information to remember (be specific and concise)",
      "category": "preferences|decisions|technical|project|other",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Guidelines:
- Extract 2-5 most important pieces of information
- Be specific - avoid vague statements like "user likes good code"
- Include concrete details (file paths, specific technologies, actual choices)
- Assign appropriate category
- Add relevant tags for easy retrieval
- Don't extract trivial or temporary information`;

    // Import aiService for analysis
    const { aiService } = await import('./aiService');

    // Use AI to extract memories
    const response = await aiService.chat(
      extractionPrompt,
      [],
      undefined, // no status update
      undefined, // no images
      undefined, // no chatId
      undefined, // no messageId
      {
        temperature: 0.3, // Low temperature for consistent extraction
        maxTokens: 1000,
        systemPrompt: 'You are a memory extraction system. Analyze conversations and extract important information in the specified JSON format.',
      }
    );

    // Parse AI response
    let extractedMemories: Array<{ content: string; category: string; tags: string[] }> = [];
    try {
      const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/) ||
                        response.text.match(/\{[\s\S]*"memories"[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        extractedMemories = parsed.memories || [];
      } else {
        // Fallback: Try to parse entire response as JSON
        const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        if (cleaned.startsWith('{')) {
          const parsed = JSON.parse(cleaned);
          extractedMemories = parsed.memories || [];
        }
      }
    } catch (error) {
      console.warn('[MemoryExtractor] Failed to parse extraction response:', error);
      return 0;
    }

    if (extractedMemories.length === 0) {
      console.log('[MemoryExtractor] No important memories found in conversation');
      return 0;
    }

    // Save extracted memories
    let savedCount = 0;
    for (const memoryData of extractedMemories) {
      try {
        await memoryService.create({
          content: memoryData.content,
          role: 'system',
          session_id: sessionId,
          metadata: {
            importance,
            category: memoryData.category || 'other',
            tags: memoryData.tags,
            source: 'agent',
          },
        });
        savedCount++;
      } catch (error) {
        console.warn('[MemoryExtractor] Failed to save memory:', error);
      }
    }

    console.log(`[MemoryExtractor] Extracted and saved ${savedCount} memories from conversation`);
    return savedCount;
  } catch (error) {
    console.error('[MemoryExtractor] Failed to extract memories:', error);
    return 0;
  }
}

/**
 * Generate a session summary and save it as a memory (like AgentSmith's summarize_session)
 */
export async function generateSessionSummary(
  messages: ConversationMessage[],
  sessionId: string | null
): Promise<string | null> {
  // Don't summarize very short conversations
  if (messages.length < 5) {
    return null;
  }

  try {
    const conversation = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    const summaryPrompt = `Provide a concise summary of the following conversation. Focus on:
1. Main topics discussed
2. Important decisions made
3. Technical details or choices
4. Any outcomes or conclusions

CONVERSATION:
${conversation}

Provide a summary in 2-4 sentences.`;

    const { aiService } = await import('./aiService');

    const response = await aiService.chat(
      summaryPrompt,
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      {
        temperature: 0.5,
        maxTokens: 500,
        systemPrompt: 'You are a conversation summarizer. Provide concise, factual summaries.',
      }
    );

    const summary = response.text.trim();
    console.log(`[MemoryExtractor] Generated session summary: ${summary}`);

    // Save summary as a memory entry (persistent across sessions like AgentSmith)
    if (summary && sessionId) {
      try {
        const { memoryService } = await import('./memoryService');
        await memoryService.create({
          content: `Session Summary: ${summary}`,
          role: 'system',
          session_id: sessionId,
          metadata: {
            category: 'session-summary',
            importance: 'medium',
            tags: ['summary'],
          },
          notes: 'Auto-generated summary of session conversation',
        });
        console.log('[MemoryExtractor] Saved session summary as memory');
      } catch (error) {
        console.error('[MemoryExtractor] Failed to save summary as memory:', error);
      }
    }

    return summary;
  } catch (error) {
    console.error('[MemoryExtractor] Failed to generate summary:', error);
    return null;
  }
}

/**
 * Check if conversation should trigger memory extraction
 */
export function shouldExtractMemories(
  messages: ConversationMessage[],
  turnCount: number
): boolean {
  // Extract every 5 turns (like AgentSmith's summarize_every, but for extraction)
  if (turnCount % 5 !== 0) {
    return false;
  }

  // Must have at least 3 messages
  return messages.length >= 3;
}

/**
 * Check if conversation should be summarized
 */
export function shouldSummarizeSession(
  messages: ConversationMessage[],
  turnCount: number
): boolean {
  // Summarize every 10 turns (AgentSmith uses 20, but we use 10 for more frequent summaries)
  if (turnCount % 10 !== 0) {
    return false;
  }

  // Must have at least 5 messages
  return messages.length >= 5;
}
