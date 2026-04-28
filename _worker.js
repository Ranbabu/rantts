export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. जब वेबसाइट से Play बटन दबेगा (ऑडियो बनाने के लिए)
    if (request.method === "POST" && url.pathname === "/api") {
      try {
        const body = await request.json();
        const { text, model, voice } = body;

        // Cloudflare Settings से आपकी AI Studio की Key लेना
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
          throw new Error(data.error?.message || "Google API Error. मॉडल बदल कर देखें या API Key चेक करें।");
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

    // 2. जब कोई सीधे वेबसाइट का लिंक खोलेगा, तो यह HTML डिज़ाइन दिखेगा
    return new Response(HTML_CONTENT, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  }
};

// ==========================================
// आपकी पूरी वेबसाइट का डिज़ाइन (UI) अब यहीं है
// ==========================================
const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Aryan News TTS Studio</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Roboto', sans-serif; background: #f0f4f8; margin: 0; padding: 0; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 500px; background: #fff; min-height: 100vh; display: flex; flex-direction: column; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: #4285f4; color: #fff; padding: 18px; text-align: center; font-size: 22px; font-weight: bold; }
        .content { padding: 20px; flex: 1; }
        label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: bold; color: #333; }
        textarea, select { width: 100%; padding: 12px; margin-bottom: 18px; border: 1px solid #ccc; border-radius: 8px; font-size: 15px; outline: none; }
        textarea:focus, select:focus { border-color: #4285f4; }
        textarea { height: 180px; resize: none; }
        .btn-group { display: flex; gap: 10px; margin-top: 10px; }
        button { flex: 1; padding: 15px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; color: white; cursor: pointer; transition: 0.3s; }
        .play-btn { background: #34a853; }
        .dl-btn { background: #ea4335; }
        button:active { opacity: 0.8; }
        button:disabled { background: #bdc1c6; cursor: not-allowed; }
        .loader { text-align: center; color: #4285f4; font-weight: bold; display: none; margin-bottom: 15px;}
        .info-box { background: #e8f0fe; padding: 10px; border-radius: 8px; font-size: 12px; color: #1967d2; margin-top: 20px; border: 1px solid #d2e3fc; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Aryan News TTS</div>
        <div class="content">
            <label>टेक्स्ट या न्यूज़ स्क्रिप्ट (Text):</label>
            <textarea id="textInput" placeholder="नमस्ते! आप देख रहे हैं आर्यन न्यूज़..."></textarea>

            <label>Gemini मॉडल:</label>
            <select id="modelSelect">
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Stable)</option>
            </select>

            <label>आवाज़ (Voice):</label>
            <select id="voiceSelect">
                <option value="Aoede">Aoede (Female)</option>
                <option value="Puck">Puck (Male)</option>
                <option value="Charon">Charon (Deep Male)</option>
                <option value="Kore">Kore (Female Soft)</option>
            </select>

            <div id="loadingText" class="loader">ऑडियो बन रहा है, कृपया प्रतीक्षा करें...</div>

            <div class="btn-group">
                <button id="playBtn" class="play-btn" onclick="generateAudio()">▶ Play Audio</button>
                <button id="dlBtn" class="dl-btn" onclick="downloadAudio()">⬇ Download MP3</button>
            </div>
            
            <audio id="audioPlayer" controls style="width: 100%; margin-top: 20px; display: none;"></audio>
            
            <div class="info-box">
                <b>यह वेबसाइट पूरी तरह Cloudflare पर चल रही है।</b>
            </div>
        </div>
    </div>

    <script>
        let currentBlob = null;
        
        const API_URL = '/api';

        async function generateAudio() {
            const text = document.getElementById('textInput').value.trim();
            const model = document.getElementById('modelSelect').value;
            const voice = document.getElementById('voiceSelect').value;
            
            if(!text) { alert('पहले स्क्रिप्ट लिखें!'); return; }
            
            const playBtn = document.getElementById('playBtn');
            const loader = document.getElementById('loadingText');
            const player = document.getElementById('audioPlayer');

            playBtn.disabled = true;
            loader.style.display = 'block';
            player.style.display = 'none';

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, model, voice })
                });
                
                const data = await res.json(); 
                
                if(!res.ok) throw new Error(data.error || 'Server Error');
                
                const audioSrc = 'data:' + data.format + ';base64,' + data.audio;
                const fetchRes = await fetch(audioSrc);
                currentBlob = await fetchRes.blob();
                
                player.src = audioSrc;
                player.style.display = 'block';
                player.play();
            } catch(e) {
                console.error(e);
                alert('एरर आ गया: ' + e.message);
            } finally {
                playBtn.disabled = false;
                loader.style.display = 'none';
            }
        }
        
        function downloadAudio() {
            if(!currentBlob) { alert('पहले Play दबाकर ऑडियो जनरेट करें!'); return; }
            const a = document.createElement('a');
            a.href = URL.createObjectURL(currentBlob);
            a.download = 'AryanNews_Audio_' + Date.now() + '.ogg'; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    </script>
</body>
</html>
`;
