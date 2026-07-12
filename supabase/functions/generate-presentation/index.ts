import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PresentationParams {
  content: string;
  n_slides?: number;
  tone?: string;
  verbosity?: string;
  image_type?: string;
  theme?: string;
  language?: string;
  include_title_slide?: boolean;
  include_table_of_contents?: boolean;
}

interface Slide {
  title: string;
  content: string[];
  layout: string;
  imageUrl?: string;
  imageQuery?: string;
  notes?: string;
}

async function getSecret(key: string): Promise<string> {
  // Kept for backward compatibility with any remaining callers; prefer resolveOrgLlm.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const { createClient } = await import('npm:@supabase/supabase-js@2');
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

async function generatePresentation(params: PresentationParams & { organizationId?: string }): Promise<Slide[]> {
  const { chatCompletion, resolveOrgLlm } = await import("../_shared/orgLlm.ts");
  const llm = await resolveOrgLlm(params.organizationId);

  const numSlides = params.n_slides || 5;
  const tone = params.tone || "professional";
  const verbosity = params.verbosity || "standard";
  const includeTitle = params.include_title_slide !== false;
  const includeTOC = params.include_table_of_contents || false;

  const systemPrompt = `You are an expert presentation designer. Create engaging, well-structured presentation slides.

TONE: ${tone}
VERBOSITY: ${verbosity}
LANGUAGE: ${params.language || 'English'}

Guidelines:
- Create clear, impactful titles for each slide
- Use bullet points effectively (3-5 per slide for standard verbosity)
- Include relevant content that flows logically
- Suggest appropriate images for each slide with search queries
- Add speaker notes for context
- Use professional language and structure`;

  const userPrompt = `Create a ${numSlides}-slide presentation about: "${params.content}"

${includeTitle ? 'Include a title slide as the first slide.' : 'Start directly with content slides.'}
${includeTOC ? 'Include a table of contents slide as the second slide.' : ''}

For each slide, provide:
1. A clear, engaging title
2. 3-5 bullet points of content (adjust based on verbosity: ${verbosity})
3. A layout type (title_slide, content, two_column, image_focus, or quote)
4. An image search query that would find a relevant stock photo
5. Brief speaker notes

Return ONLY valid JSON in this exact format:
{
  "slides": [
    {
      "title": "Slide title",
      "content": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
      "layout": "content",
      "imageQuery": "professional meeting teamwork",
      "notes": "Speaker notes for this slide"
    }
  ]
}`;

  const response = await chatCompletion(llm, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse LLM response");
  }

  const result = JSON.parse(jsonMatch[0]);
  const slides: Slide[] = result.slides.map((slide: any) => ({
    ...slide,
    imageUrl: slide.imageQuery ? getPexelsImageUrl(slide.imageQuery) : undefined,
  }));

  return slides;
}

function getPexelsImageUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop`;
}

function generateHTML(slides: Slide[], theme: string = "professional-blue"): string {
  const themeColors = {
    "professional-blue": { primary: "#2563eb", secondary: "#1e40af", background: "#f8fafc", text: "#1e293b" },
    "professional-dark": { primary: "#3b82f6", secondary: "#1d4ed8", background: "#0f172a", text: "#f1f5f9" },
    "edge-yellow": { primary: "#f59e0b", secondary: "#d97706", background: "#fffbeb", text: "#78350f" },
    "light-rose": { primary: "#f43f5e", secondary: "#e11d48", background: "#fff1f2", text: "#881337" },
    "mint-blue": { primary: "#06b6d4", secondary: "#0891b2", background: "#ecfeff", text: "#164e63" },
  };

  const colors = themeColors[theme as keyof typeof themeColors] || themeColors["professional-blue"];

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: #1a1a1a;
      color: #fff;
      overflow: hidden;
    }
    .slide {
      width: 100vw;
      height: 100vh;
      display: none;
      padding: 60px 80px;
      background: ${colors.background};
      color: ${colors.text};
      position: relative;
      background-size: cover;
      background-position: center;
    }
    .slide.active { display: flex; flex-direction: column; justify-content: center; }
    .slide.title_slide { justify-content: center; align-items: center; text-align: center; }
    .slide.image_focus { padding: 0; }
    .slide h1 {
      font-size: 3.5rem;
      font-weight: 800;
      margin-bottom: 20px;
      color: ${colors.primary};
      line-height: 1.2;
    }
    .slide.title_slide h1 { font-size: 5rem; color: ${colors.primary}; }
    .slide h2 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 30px;
      color: ${colors.primary};
    }
    .content {
      font-size: 1.5rem;
      line-height: 1.8;
      max-width: 1200px;
    }
    .content li {
      margin-bottom: 20px;
      padding-left: 30px;
      position: relative;
    }
    .content li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: ${colors.primary};
      font-size: 2rem;
      font-weight: bold;
    }
    .image-container {
      position: absolute;
      top: 0;
      right: 0;
      width: 40%;
      height: 100%;
      overflow: hidden;
    }
    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .slide.image_focus .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7));
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px;
      color: white;
    }
    .controls {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      z-index: 1000;
    }
    button {
      padding: 15px 30px;
      font-size: 1rem;
      background: ${colors.primary};
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
    }
    button:hover { background: ${colors.secondary}; }
    .slide-number {
      position: fixed;
      bottom: 30px;
      right: 30px;
      font-size: 1rem;
      color: ${colors.primary};
      background: rgba(255,255,255,0.9);
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>`;

  slides.forEach((slide, index) => {
    html += `  <div class="slide ${slide.layout} ${index === 0 ? 'active' : ''}" data-slide="${index}">`;

    if (slide.layout === 'image_focus' && slide.imageUrl) {
      html += `    <img src="${slide.imageUrl}" alt="${slide.title}" style="position: absolute; width: 100%; height: 100%; object-fit: cover;">`;
      html += `    <div class="image-overlay">`;
      html += `      <h1>${slide.title}</h1>`;
      if (slide.content.length > 0) {
        html += `      <div class="content"><ul>`;
        slide.content.forEach(point => {
          html += `        <li>${point}</li>`;
        });
        html += `      </ul></div>`;
      }
      html += `    </div>`;
    } else {
      if (slide.layout === 'title_slide') {
        html += `    <h1>${slide.title}</h1>`;
        if (slide.content.length > 0) {
          html += `    <p style="font-size: 1.8rem; margin-top: 20px; color: ${colors.text};">${slide.content[0]}</p>`;
        }
      } else {
        html += `    <h2>${slide.title}</h2>`;
        if (slide.content.length > 0) {
          html += `    <div class="content"><ul>`;
          slide.content.forEach(point => {
            html += `      <li>${point}</li>`;
          });
          html += `    </ul></div>`;
        }
        if (slide.imageUrl && slide.layout !== 'content') {
          html += `    <div class="image-container"><img src="${slide.imageUrl}" alt="${slide.title}"></div>`;
        }
      }
    }

    html += `  </div>\n`;
  });

  html += `  <div class="controls">
    <button onclick="previousSlide()">← Previous</button>
    <button onclick="nextSlide()">Next →</button>
  </div>
  <div class="slide-number">
    <span id="current">1</span> / <span id="total">${slides.length}</span>
  </div>
  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const totalSlides = slides.length;

    function showSlide(n) {
      slides[currentSlide].classList.remove('active');
      currentSlide = (n + totalSlides) % totalSlides;
      slides[currentSlide].classList.add('active');
      document.getElementById('current').textContent = currentSlide + 1;
    }

    function nextSlide() { showSlide(currentSlide + 1); }
    function previousSlide() { showSlide(currentSlide - 1); }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') previousSlide();
    });

    document.getElementById('total').textContent = totalSlides;
  </script>
</body>
</html>`;

  return html;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const params: PresentationParams = await req.json();

    if (!params.content || params.content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const slides = await generatePresentation(params);
    const html = generateHTML(slides, params.theme);

    const presentationId = crypto.randomUUID();

    return new Response(
      JSON.stringify({
        presentationId,
        slides,
        html,
        status: "completed",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating presentation:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate presentation",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
