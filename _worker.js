export default {
  async fetch(request, env) {
    // CORS Headers: यह दूसरी वेबसाइट (जैसे Github Pages) को इस API को एक्सेस करने की परमिशन देता है
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // OPTIONS रिक्वेस्ट (CORS Preflight) को हैंडल करने के लिए
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // जब Play बटन दबेगा, तो यह API (बैकएंड) चलेगा
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const { text, model, voice } = body;

        // Cloudflare Settings से API Key लेना
        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Cloudflare Settings में API Key सेव नहीं है!" }), { 
            status: 500, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
          });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const payload = {
          contents: [{ parts: [{ text: text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || "Aoede" }
              }
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
          throw new Error(data.error?.message || "Google API Error. मॉडल का नाम चेक करें।");
        }

        // ऑडियो डेटा निकालना
        const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
        
        return new Response(JSON.stringify({ audio: audioBase64, format: 'audio/ogg' }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
    }
    
    // अगर कोई डायरेक्ट URL खोलेगा तो यह मैसेज दिखेगा
    return new Response(JSON.stringify({ message: "API is working! Send a POST request to generate audio." }), { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};
