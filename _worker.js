export default {
  async fetch(request, env) {
    // CORS Headers: यह GitHub Pages को बिना ब्लॉक किए कनेक्ट होने देगा
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // 1. ब्राउज़र की सिक्योरिटी चेकिंग (OPTIONS Request) को पास करने के लिए
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. जब वेबसाइट से Play बटन दबेगा (POST Request)
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const { text, model, voice } = body;

        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Cloudflare में API Key नहीं है!" }), { 
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } 
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
          throw new Error(data.error?.message || "Google API Error");
        }

        const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
        
        // सफलता पूर्वक ऑडियो वापस भेजना
        return new Response(JSON.stringify({ audio: audioBase64, format: 'audio/ogg' }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
    }
    
    // 3. अगर कोई डायरेक्ट लिंक खोलेगा तो यह दिखेगा
    return new Response(JSON.stringify({ status: "API is Live & Running!" }), { 
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};
