export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { text, model, voice } = body;

        // Cloudflare Settings से API Key लेना
        const apiKey = env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Cloudflare में API Key सेट नहीं है!" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
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

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "Google API Error");

        const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
        return new Response(JSON.stringify({ 
            audio: audioBase64, 
            format: 'audio/ogg' 
        }), { headers: { "Content-Type": "application/json" } });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
