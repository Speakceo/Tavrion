import { getSupabaseAnonKey, getSupabaseUrl } from '../lib/supabaseEnv';

const SUPABASE_URL = getSupabaseUrl();
const SUPABASE_ANON_KEY = getSupabaseAnonKey();

/** Active org for AI calls — set from AuthContext when the user signs in. */
let activeOrganizationId: string | null = null;

export function setOpenAiOrganizationId(organizationId: string | null | undefined) {
  activeOrganizationId = organizationId || null;
}

export function getOpenAiOrganizationId() {
  return activeOrganizationId;
}

function orgPayload(extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    organizationId: activeOrganizationId,
  };
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(orgPayload(body)),
  });
  return response;
}

export class OpenAIService {
  async generateCourse(params: {
    topic: string;
    targetRole: string;
    country: string;
    additionalContext?: string;
  }): Promise<any> {
    const response = await postJson('ai-chat', {
      action: 'generate-course',
      topic: params.topic,
      targetRole: params.targetRole,
      country: params.country,
      additionalContext: params.additionalContext,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to generate course: ${error}`);
    }

    return await response.json();
  }

  async generateSlides(_params: {
    topic: string;
    targetRole: string;
    country: string;
  }): Promise<any[]> {
    return [];
  }

  async generateQuiz(_params: {
    topic: string;
    targetRole: string;
  }): Promise<any[]> {
    return [];
  }

  async chatTutor(params: {
    userMessage: string;
    context?: string;
    userRole: string;
    conversationHistory?: { role: string; content: string }[];
  }): Promise<string> {
    const response = await postJson('ai-chat', {
      action: 'chat-tutor',
      userMessage: params.userMessage,
      context: params.context,
      userRole: params.userRole,
      conversationHistory: params.conversationHistory || [],
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get AI tutor response: ${error}`);
    }

    const data = await response.json();
    return data.response;
  }

  async mockCallAgent(params: {
    scenarioType: string;
    systemPrompt?: string;
    userMessage: string;
    conversationHistory: { role: string; message: string }[];
    userId: string;
    isNewCall: boolean;
  }): Promise<string> {
    const response = await postJson('mock-call-agent', {
      scenarioType: params.scenarioType,
      systemPrompt: params.systemPrompt,
      userMessage: params.userMessage,
      conversationHistory: params.conversationHistory,
      userId: params.userId,
      isNewCall: params.isNewCall,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.limitReached) {
        throw new Error(errorData.error);
      }
      throw new Error(errorData.error || `Failed to get AI response: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  async evaluateMockCall(params: {
    scenarioType: string;
    transcript: { role: string; message: string }[];
    evaluationRubric?: string;
  }): Promise<{ score: number; feedback: string; strengths: string[]; improvements: string[] }> {
    const response = await postJson('mock-call-evaluate', {
      scenarioType: params.scenarioType,
      transcript: params.transcript,
      evaluationRubric: params.evaluationRubric,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to evaluate call: ${error}`);
    }

    return await response.json();
  }

  async evaluateAnswer(params: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
  }): Promise<{ isCorrect: boolean; feedback: string; score: number }> {
    const response = await postJson('ai-chat', {
      action: 'evaluate-answer',
      question: params.question,
      userAnswer: params.userAnswer,
      correctAnswer: params.correctAnswer,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to evaluate answer: ${error}`);
    }

    return await response.json();
  }

  async textToSpeech(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova',
  ): Promise<Blob> {
    const response = await postJson('openai-proxy', {
      action: 'text-to-speech',
      text,
      voice,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to convert text to speech: ${error}`);
    }

    return response.blob();
  }

  async speechToText(audioBlob: Blob): Promise<string> {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = uint8Array.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    const audioData = btoa(binaryString);

    const response = await postJson('openai-proxy', {
      action: 'speech-to-text',
      audioData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to transcribe audio: ${error}`);
    }

    const data = await response.json();
    return data.text;
  }
}

export const openaiService = new OpenAIService();
