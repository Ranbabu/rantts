export default {
  async fetch(request, env) {
    // 1. जब कोई वेबसाइट खोलेगा तो यह HTML (डिजाइन) दिखेगा
    if (request.method === "GET") {
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // 2. जब Play बटन दबेगा, तो यह API (बैकएंड) चलेगा
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const { text, model, voice } = body;

        // Cloudflare Settings से API Key लेना
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
        if (!response.ok) throw new Error(data.error?.message || "Google API Error");

        const audioBase64 = data.candidates[0].content.parts[0].inlineData.data;
        return new Response(JSON.stringify({ audio: audioBase64, format: 'audio/ogg' }), {
          headers: { "Content-Type": "application/json" }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, headers: { "Content-Type": "application/json" } 
        });
      }
    }
    
    return new Response("Not found", { status: 404 });
  }
};

// ==========================================
// यहाँ से नीचे आपकी वेबसाइट का डिज़ाइन (UI) है
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
        body { font-family: 'Roboto', sans-serif; background: #f0f2f5; margin: 0; padding: 0; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 500px; background: #fff; min-height: 100vh; display: flex; flex-direction: column; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: #1a73e8; color: #fff; padding: 18px; text-align: center; font-size: 22px; font-weight: bold; }
        .content { padding: 20px; flex: 1; }
        label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 600; color: #444; }
        textarea, select { width: 100%; padding: 14px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 10px; font-size: 16px; outline: none; transition: 0.3s; }
        textarea:focus, select:focus { border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.1); }
        textarea { height: 180px; resize: none; }
        .btn-group { display: flex; gap: 12px; margin-top: 5px; }
        button { flex: 1; padding: 16px; border: none; border-radius: 10px; font-size: 16px; font-weight: bold; color: white; cursor: pointer; transition: 0.2s; }
        .play-btn { background: #34a853; }
        .dl-btn { background: #ea4335; }
        button:active { transform: scale(0.98); }
        button:disabled { background: #bdc1c6; cursor: not-allowed; }
        .loader { text-align: center; color: #1a73e8; font-weight: bold; display: none; margin-bottom: 15px; }
        .status-box { background: #e8f0fe; padding: 12px; border-radius: 8px; font-size: 13px; color: #1967d2; border: 1px solid #d2e3fc; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Aryan News TTS Pro</div>
        <div class="content">
            <label>न्यूज़ स्क्रिप्ट पेस्ट करें:</label>
            <textarea id="textInput" placeholder="नमस्ते! आप देख रहे हैं आर्यन न्यूज़ टेक..."></textarea>

            <label>Gemini AI मॉडल चुनें:</label>
            <select id="modelSelect">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash TTS (Fast)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro TTS (HD Quality)</option>
                <option value="gemini-3.1-flash">Gemini 3.1 Flash TTS (New Preview)</option>
            </select>

            <label>वॉइस (Voice):</label>
            <select id="voiceSelect">
                <option value="Aoede">Aoede (Female - Clear)</option>
                <option value="Puck">Puck (Male - Energetic)</option>
                <option value="Charon">Charon (Male - Deep)</option>
                <option value="Kore">Kore (Female - Soft)</option>
                <option value="Fenrir">Fenrir (Male - Bold)</option>
            </select>

            <div id="loadingText" class="loader">Gemini ऑडियो जनरेट कर रहा है...</div>

            <div class="btn-group">
                <button id="playBtn" class="play-btn" onclick="generate()">▶ Play Audio</button>
                <button id="dlBtn" class="dl-btn" onclick="download()">⬇ Download</button>
            </div>
            
            <audio id="audioPlayer" controls style="width: 100%; margin-top: 25px; display: none;"></audio>
            
            <div class="status-box">
                <b>Note:</b> API Key सुरक्षित रूप से Cloudflare सर्वर में स्टोर है।
            </div>
        </div>
    </div>

    <script>
        let audioBlob = null;
        async function generate() {
            const text = document.getElementById('textInput').value.trim();
            const model = document.getElementById('modelSelect').value;
            const voice = document.getElementById('voiceSelect').value;
            
            if(!text) { alert('स्क्रिप्ट बॉक्स खाली है!'); return; }
            
            const playBtn = document.getElementById('playBtn');
            const loader = document.getElementById('loadingText');
            const player = document.getElementById('audioPlayer');

            playBtn.disabled = true;
            loader.style.display = 'block';
            player.style.display = 'none';

            try {
                // यह उसी सिंगल फाइल से डेटा मंगाएगा
                const res = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, model, voice })
                });
                
                const data = await res.json();
                if(!res.ok) throw new Error(data.error || 'Server Error');
                
                const audioSrc = 'data:audio/ogg;base64,' + data.audio;
                const fetchRes = await fetch(audioSrc);
                audioBlob = await fetchRes.blob();
                
                player.src = audioSrc;
                player.style.display = 'block';
                player.play();
            } catch(e) {
                alert('एरर: ' + e.message);
            } finally {
                playBtn.disabled = false;
                loader.style.display = 'none';
            }
        }
        
        function download() {
            if(!audioBlob) { alert('पहले ऑडियो जनरेट करें!'); return; }
            const a = document.createElement('a');
            a.href = URL.createObjectURL(audioBlob);
            a.download = 'AryanNews_TTS_' + Date.now() + '.ogg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    </script>
</body>
</html>
`;
