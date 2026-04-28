export async function onRequestPost(context) {
    const { request } = context;

    try {
        const body = await request.json();
        const { provider, text, apiKey, model, voice } = body;

        // 1. Google AI Studio (Gemini 2.5 TTS Output)
        if (provider === 'gemini') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            const payload = {
                contents: [{ parts: [{ text: text }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voice || "Puck" }
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

            // Extract Base64 Audio from Gemini Response
            const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
            return new Response(JSON.stringify({ 
                type: 'audio', 
                audio: audioBase64, 
                format: 'audio/ogg' 
            }), { headers: { "Content-Type": "application/json" } });
        }
        
        // 2. OpenRouter API (Text Generation)
        else if (provider === 'openrouter') {
            const url = "https://openrouter.ai/api/v1/chat/completions";
            
            const payload = {
                model: model || "google/gemini-2.5-flash:free",
                messages: [{ role: "user", content: text }]
            };

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error("OpenRouter API Error");

            const replyText = data.choices[0].message.content;
            return new Response(JSON.stringify({ 
                type: 'text', 
                content: replyText 
            }), { headers: { "Content-Type": "application/json" } });
        }

        else {
            return new Response(JSON.stringify({ error: "Invalid provider" }), { status: 400 });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
}
