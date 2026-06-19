import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(key: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Secret ${key} not found`);
  }

  return data.value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, ...params } = await req.json();

    const OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');

    if (action === "chat-tutor") {
      const { userMessage, context, userRole } = params;

      const systemPrompt = `You are an AI tutor for Amberstudent LMS. Help ${userRole} team members
learn about student accommodation, sales processes, operations, and customer service.
Be helpful, encouraging, and provide practical examples.
${context ? `\nContext: ${context}` : ''}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ response: data.choices[0].message.content }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (action === "generate-course") {
      const { topic, targetRole, country } = params;

      const systemPrompt = `You are an expert instructional designer for Amberstudent, a student accommodation platform.
Create comprehensive, practical training content for ${targetRole} team members in ${country}.`;

      const userPrompt = `Create a detailed course outline for: "${topic}"

Return ONLY a valid JSON structure with:
{
  "title": "Course title",
  "description": "Course description",
  "modules": [
    {
      "title": "Module title",
      "description": "Module description",
      "lessons": [
        {
          "title": "Lesson title",
          "type": "slides|text|quiz",
          "content": { ... }
        }
      ]
    }
  ]
}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      try {
        const cleanedResponse = content.trim();
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        const courseData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanedResponse);

        return new Response(
          JSON.stringify(courseData),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (error) {
        console.error('Failed to parse OpenAI response:', content);
        throw new Error('Failed to parse course content. Please try again.');
      }
    }

    if (action === "evaluate-answer") {
      const { question, userAnswer, correctAnswer } = params;

      const systemPrompt = `Evaluate the user's answer to a training question.
Be fair and constructive. Award partial credit for partially correct answers.`;

      const userPrompt = `Question: ${question}
Correct Answer: ${correctAnswer}
User Answer: ${userAnswer}

Evaluate and return JSON:
{
  "isCorrect": boolean,
  "score": 0-100,
  "feedback": "detailed feedback"
}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages,
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const evaluation = JSON.parse(data.choices[0].message.content);

      return new Response(
        JSON.stringify(evaluation),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    throw new Error("Unknown action");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
