export async function estimateDuration(taskTitle: string): Promise<number> {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  const prompt = `Estimate how long in minutes (choose from 15, 30, 45 or 60) the following task will take: "${taskTitle}". Respond with just one number.`;
  if (!key) {
    console.warn('Gemini API key not set');
    return 30;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        })
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\d+/);
    const minutes = match ? parseInt(match[0], 10) : NaN;
    if ([15,30,45,60].includes(minutes)) {
      return minutes;
    }
  } catch (e) {
    console.error('Gemini API error', e);
  }
  return 30;
}
