export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. जब वेबसाइट से Play बटन दबेगा (ऑडियो बनाने के लिए)
    if (request.method === "POST" && url.pathname === "/api") {
      try {
        const body = await request.json();
        const { text, model, voice } = body;

        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Cloudflare Settings में API Key सेव नहीं है!" }), { 
            status: 500, headers: { "Content-Type": "application/json" } 
          });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
          contents: [{ parts: [{ text: text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Aoede" } }
            }
          }
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || "Google API Error. मॉडल बदल कर देखें।");
        }

        const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
        
        return new Response(JSON.stringify({ audio: audioBase64, format: 'audio/ogg' }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, headers: { "Content-Type": "application/json" } 
        });
      }
    }

    // 2. जब कोई सीधे वेबसाइट खोलेगा, तो यह अपने आप index.html दिखा देगा
    return env.ASSETS.fetch(request);
  }
};
