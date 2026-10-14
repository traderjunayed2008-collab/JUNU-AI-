export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { image, mimeType } = req.body;
        const apiKey = process.env.GEMINI_API_KEY || "AQ.Ab8RN6J_1peouGHb9CAFhUVphicAaU6L7ZGm8v0Ox-s0g05nUw";

        if (!image) {
            return res.status(400).json({ error: 'No image data provided' });
        }

        const promptText = `You are an expert financial binary options chart analyst. Analyze this screenshot carefully:
        1. FIRST: Verify if this is a valid candlestick trading chart. If NOT, return JSON:
           {"isChart": false, "pair": "Invalid Image", "signal": "NOT A CHART ⚠️", "confidence": "0%", "reasoning": "Uploaded file is not a valid trading chart. Please upload a Quotex screenshot."}

        2. SECOND: If it IS a valid chart, identify the currency pair, current price action, trend, and support/resistance zones. Provide trade decision:
           Respond strictly in structured JSON format:
           {"isChart": true, "pair": "EUR/USD (OTC)", "signal": "CALL (UP) ▲", "confidence": "93%", "reasoning": "Bullish rejection pattern detected at key support level."}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: promptText },
                        { inline_data: { mime_type: mimeType || "image/png", data: image } }
                    ]
                }]
            })
        });

        const data = await response.json();

        if (!data.candidates || !data.candidates[0]) {
            return res.status(500).json({ error: 'Failed to process image with Gemini AI' });
        }

        const rawText = data.candidates[0].content.parts[0].text;
        const jsonStart = rawText.indexOf('{');
        const jsonEnd = rawText.lastIndexOf('}') + 1;
        const parsed = JSON.parse(rawText.substring(jsonStart, jsonEnd));

        return res.status(200).json(parsed);

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
