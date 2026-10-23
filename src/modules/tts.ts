// ponytail: single fetch to Gemini 2.5 Flash TTS instead of @google/genai SDK
export async function generateGeminiTTS(
  text: string,
  apiKey: string
): Promise<{ audioBase64?: string; sampleRate: number }> {
  if (!apiKey) return { sampleRate: 24000 }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `พูดขอบคุณโดเนทด้วยน้ำเสียงสดใส: ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } }
        }
      })
    }
  )
  if (!res.ok) return { sampleRate: 24000 }
  const data = (await res.json()) as any
  const part = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData
  const rateMatch = part?.mimeType?.match(/rate=(\d+)/)
  return {
    audioBase64: part?.data,
    sampleRate: rateMatch ? Number(rateMatch[1]) : 24000
  }
}
