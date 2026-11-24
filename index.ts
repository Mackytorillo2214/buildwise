// Supabase Edge Function "reference-chat" for BuildWise.
// Reads a client's reference (text, photos, video frames, PDF), answers questions about the planner,
// fills in planner answers, adds extra materials and can arrange the rooms.
//
// Free option (Google Gemini):   secret GEMINI_API_KEY   (optional GEMINI_MODEL, default gemini-3.8-flash)
// Paid option (Claude):          secret ANTHROPIC_API_KEY (optional ANTHROPIC_MODEL, default claude-sonnet-5-5)
// Which one is used:             AI_PROVIDER = "gemini" or "claude"; if not set, Gemini is used when GEMINI_API_KEY exists.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `You are the planning assistant inside BuildWise, a house-cost planner used in the Philippines. Prices are in Philippine pesos (PHP).
You do four jobs. Choose the right one from what the user wrote.

1) QUESTIONS. If the user asks something (what a planner question means, which option is better, what is normal, how much something costs), answer it in "reply": plain language, at most about 120 words, Philippine context (CHB = concrete hollow block, CR = comfort room / bathroom, T&B = toilet and bath). Give a clear recommendation when they ask for one, and say they can answer "use that" to apply it. In this job leave "plan", "extras" and "layout" empty.
   The FOCUS block (if present) tells you which planner question the user is looking at. Questions like "what should I pick?" refer to it.

2) READING A REFERENCE (photos, floor plans, video frames, a PDF, or text). Call out ONLY what you can see or the user clearly stated. Never invent numbers. Put it in "plan".
   - Floor plans with dimensions or labelled rooms: count bedrooms, master bedrooms, comfort rooms, garage, terrace, balcony; add up the floor area if dimensions are shown.
   - Photos of a finished house: infer storeys, wall material, glass share, balcony, garage, fence (and fenceType: chb = concrete block wall, chbsteel = low concrete base with steel bars, steel = metal/wrought iron, wire = chain-link, bamboo, wood = picket), and say these are visual guesses.
   - walls: "chb" or "wood". partitions: "chb4", "plywood" or "gypsum". glass is a share from 0 to 1. garage: 0 none, 1 one car, 2 two cars.
   - An apartment building with several units: add up bedrooms and bathrooms of all units, and say so.
   - Interior look: if the user or a photo shows a style, set plan.style to one of modern, minimalist, classic, tropical (Filipino / rustic / wood and greens), industrial. Only when it is clear.

3) EXTRA MATERIALS. Things the user wants that the planner has no question for (solar panels, water tank, CCTV, pool, ceiling, aircon, cabinets...): put them in "extras" with a realistic quantity, a unit and a rough unit price in PHP. Keep names short.

5) HOUSE TEMPLATES. BuildWise has ready-made templates. When a photo, sketch or the user's words clearly resemble one, set "template" to its id and mention it in "reply". The template fills floors, rooms, walls, glass, roof and extras, and anything you put in "plan" overrides it.
   - amakan-bungalow: one storey, woven amakan (bamboo weave) or wood cladding on the upper half of the walls over a concrete base, veranda, wide flat roof.
   - compact-starter: small one-storey home, steel-sheet cladding over concrete, simple gable roof.
   - house-with-store: two storeys with a shop (sari-sari store) at the front of the ground floor and the family upstairs.
   - glass-house: almost all glass walls, flat roof.
   - modern-carport: modern two-storey box with a flat roof, balcony and carport.
   - luxury-villa: large two-storey with hip roof, columns, terrace and balcony.
   Also describe the outside in plan.look: facade ("plain" or "halfclad" = lower half concrete, upper half cladding), cladding ("amakan", "steel", "wood"), roof ("gable", "flat", "hip"), finish ("plain" or "paint" = smooth painted walls). Only when you can see or were told it.

4) ARRANGING ROOMS. Only when the user asks you to arrange, design, re-plan or place rooms, or describes where rooms should go ("living room at the front, bedrooms at the back", "arrange the rooms for a family of 5"), return "layout".
   - The house footprint of one floor is a rectangle. Describe each room as a rectangle in fractions of that floor: x0..x1 along the front (0 = left, 1 = right), y0..y1 from the front (0) to the rear (1). "floor" starts at 1.
   - Rooms on the same floor must NOT overlap and should fill the floor (leave a little space for a hallway on 2-storey plans; the staircase is added automatically on every floor of a 2+ storey house, so never draw one yourself). Keep every room at least 2 m wide and big enough: bedroom about 9 sqm or more, master bedroom about 14 sqm or more, CR about 3 sqm or more, living room about 12 sqm or more, kitchen about 10 sqm or more.
   - Allowed types: living, kitchen, dining, master, bed, cr, other. For "other" give a short name (Study, Laundry...).
   - Put living, kitchen and dining toward the front, bedrooms toward the rear; with 2 or more floors put the master bedroom upstairs and one CR downstairs.
   - Rooms listed as locked in CURRENT must not be moved: do not include them, and do not use the space they occupy.
   - Do not include garage, terrace or balcony in "layout". Use "plan" for those (garage, terrace, balcony).
   - Use the house width and depth in CURRENT to judge real sizes in square metres.

Rules for every answer: "reply" is always filled, short, plain, friendly. Say what you did or found, and what you are unsure of. Ask for ONE missing key detail only if it really helps. Do not contradict values the user typed earlier unless they ask. If you are only guessing from a photo, say so.`;

// plain JSON-schema description of the answer (converted for Gemini below)
const ANSWER = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Short plain-language message to the user." },
    plan: {
      type: "object",
      description: "Planner values the user stated or the reference clearly shows. Leave out anything unknown.",
      properties: {
        lotArea: { type: "number" }, lotWidth: { type: "number" }, lotDepth: { type: "number" },
        floorArea: { type: "number", description: "Total floor area of all floors, sqm" },
        floors: { type: "integer" },
        rooms: { type: "object", properties: { bed: { type: "integer" }, master: { type: "integer" }, cr: { type: "integer" } } },
        garage: { type: "integer", description: "0 none, 1 one car, 2 two cars" },
        terrace: { type: "number", description: "terrace area in sqm, 0 if none" },
        balcony: { type: "boolean" },
        walls: { type: "string", enum: ["chb", "wood"] },
        partitions: { type: "string", enum: ["chb4", "plywood", "gypsum"] },
        glass: { type: "number", description: "share of exterior walls that is glass, 0 to 1" },
        windows: { type: "object", properties: { count: { type: "integer" }, w: { type: "number" }, h: { type: "number" } } },
        fence: { type: "boolean" },
        fenceType: { type: "string", enum: ["chb", "chbsteel", "steel", "wire", "bamboo", "wood"] },
        budget: { type: "number", description: "total budget in PHP" },
        look: { type: "object", properties: { facade: { type: "string", enum: ["plain", "halfclad"] }, cladding: { type: "string", enum: ["amakan", "steel", "wood"] }, roof: { type: "string", enum: ["gable", "flat", "hip"] }, finish: { type: "string", enum: ["plain", "paint"] } } },
        style: { type: "string", enum: ["modern", "minimalist", "classic", "tropical", "industrial"], description: "Interior look the user wants (furniture, colours, floors in the 3D inside view)" },
      },
    },
    template: { type: "string", enum: ["amakan-bungalow", "compact-starter", "house-with-store", "glass-house", "modern-carport", "luxury-villa"], description: "A BuildWise house template the reference resembles." },
    extras: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, qty: { type: "number" }, unit: { type: "string" }, price: { type: "number", description: "unit price in PHP" } },
        required: ["name", "qty", "unit", "price"],
      },
    },
    layout: {
      type: "object",
      description: "Only when asked to arrange rooms.",
      properties: {
        rooms: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["living", "kitchen", "dining", "master", "bed", "cr", "other"] },
              name: { type: "string" },
              floor: { type: "integer", description: "1 = ground floor" },
              x0: { type: "number" }, y0: { type: "number" }, x1: { type: "number" }, y1: { type: "number" },
            },
            required: ["type", "floor", "x0", "y0", "x1", "y1"],
          },
        },
      },
    },
  },
  required: ["reply"],
};

// Gemini wants upper-case type names and does not take min/max
// deno-lint-ignore no-explicit-any
const toGemini = (s: any): any => {
  if (Array.isArray(s)) return s.map(toGemini);
  if (!s || typeof s !== "object") return s;
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === "minimum" || k === "maximum") continue;
    o[k] = k === "type" && typeof v === "string" ? v.toUpperCase() : toGemini(v);
  }
  return o;
};

type Msg = { role: string; text: string };

async function callGemini(key: string, system: string, history: Msg[], images: string[], pdfs: string[], text: string) {
  const primary = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash";
  // if the first model is busy or out of free quota, try a second one (secret GEMINI_FALLBACK_MODEL; set it to "none" to turn this off)
  const fb = Deno.env.get("GEMINI_FALLBACK_MODEL") ?? "gemini-2.5-flash";
  const models = [primary, ...(fb && fb !== "none" && fb !== primary ? [fb] : [])];
  const parts: unknown[] = [];
  for (const img of images) parts.push({ inlineData: { mimeType: "image/jpeg", data: img } });
  for (const pdf of pdfs) parts.push({ inlineData: { mimeType: "application/pdf", data: pdf } });
  parts.push({ text });
  const contents = [
    ...history.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
    { role: "user", parts },
  ];
  while (contents.length > 1 && contents[0].role !== "user") contents.shift();
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { responseMimeType: "application/json", responseSchema: toGemini(ANSWER), maxOutputTokens: 6000, temperature: 0.4 },
  });
  let res!: Response;
  outer: for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: payload,
      });
      if (res.ok || (res.status !== 500 && res.status !== 503 && res.status !== 504 && res.status !== 429)) break outer;
      if (res.status === 429) break;                     // out of quota for this model: go straight to the next one
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));   // busy: wait a moment and retry
    }
  }
  if (res.status === 429) return { status: 429, error: "The free AI limit was reached for now. Wait a minute and try again." };
  if (res.status === 503 || res.status === 500 || res.status === 504) return { status: 503, error: "Google's AI is very busy right now. Please try again in a minute." };
  if (!res.ok) return { status: 502, error: "Gemini returned " + res.status + ". " + (await res.text()).slice(0, 300) };
  const out = await res.json();
  if (out.promptFeedback?.blockReason) return { status: 422, error: "The AI declined to read that (" + out.promptFeedback.blockReason + "). Try a different file." };
  const raw = (out.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  try { return { data: JSON.parse(raw) }; } catch { return { data: null }; }
}

async function callClaude(key: string, system: string, history: Msg[], images: string[], pdfs: string[], text: string) {
  const content: unknown[] = [];
  for (const img of images) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } });
  for (const pdf of pdfs) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
  content.push({ type: "text", text });
  const messages = [
    ...history.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text || "." })),
    { role: "user", content },
  ];
  while (messages.length > 1 && messages[0].role !== "user") messages.shift();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5",
      max_tokens: 3000,
      system,
      tools: [{ name: "answer", description: "Send the answer to the user and fill the planner.", input_schema: ANSWER }],
      tool_choice: { type: "tool", name: "answer" },
      messages,
    }),
  });
  if (res.status === 429) return { status: 429, error: "The AI is busy right now. Wait a minute and try again." };
  if (!res.ok) return { status: 502, error: "The AI service returned " + res.status + ". " + (await res.text()).slice(0, 300) };
  const out = await res.json();
  const tool = (out.content ?? []).find((b: { type: string }) => b.type === "tool_use");
  return { data: tool ? tool.input : null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in first." }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Sign in first." }, 401);

    const raw = await req.text();
    if (raw.length > 12_000_000) return json({ error: "That upload is too large. Send fewer or smaller files." }, 413);
    const body = JSON.parse(raw);

    const gKey = Deno.env.get("GEMINI_API_KEY"), cKey = Deno.env.get("ANTHROPIC_API_KEY");
    const want = (Deno.env.get("AI_PROVIDER") ?? "").toLowerCase();
    const provider = want === "claude" ? (cKey ? "claude" : "") : want === "gemini" ? (gKey ? "gemini" : "") : gKey ? "gemini" : cKey ? "claude" : "";
    if (!provider) return json({ error: "No AI key is set on the server yet. Add GEMINI_API_KEY (free) or ANTHROPIC_API_KEY as a secret." }, 500);

    const images: string[] = (body.images ?? []).slice(0, 8);
    const pdfs: string[] = (body.pdfs ?? []).slice(0, 2);
    const history: Msg[] = (body.history ?? []).slice(-8).map((m: Msg) => ({ role: m.role === "user" ? "user" : "assistant", text: String(m.text ?? "").slice(0, 1500) || "." }));
    const userText = [
      String(body.text ?? "").slice(0, 4000),
      body.notes ? "Attached notes:\n" + String(body.notes).slice(0, 8000) : "",
    ].filter(Boolean).join("\n\n") || "(no text, only the attached reference)";
    const focus = body.focus ? "\n\nFOCUS (the planner question the user is looking at): " + JSON.stringify(body.focus).slice(0, 600) : "";
    const text = userText + focus + "\n\nCURRENT: " + JSON.stringify(body.current ?? {}).slice(0, 6000);

    const r = provider === "gemini"
      ? await callGemini(gKey!, SYSTEM, history, images, pdfs, text)
      : await callClaude(cKey!, SYSTEM, history, images, pdfs, text);
    if ("error" in r && r.error) return json({ error: r.error }, r.status ?? 502);
    const d = (r as { data: Record<string, unknown> | null }).data;
    if (!d) return json({ reply: "I couldn't read anything useful from that. Try adding a few details in text.", plan: {}, extras: [], provider });
    return json({
      reply: String(d.reply ?? ""),
      plan: d.plan ?? {},
      template: typeof d.template === "string" ? d.template : null,
      extras: Array.isArray(d.extras) ? d.extras : [],
      layout: d.layout && typeof d.layout === "object" ? d.layout : null,
      provider,
    });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});