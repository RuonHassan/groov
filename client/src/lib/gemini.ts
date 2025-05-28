export async function estimateDuration(taskTitle: string, taskDescription?: string | null): Promise<number> {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  
  // Combine title and description for better context
  let taskContext = taskTitle;
  if (taskDescription && taskDescription.trim()) {
    taskContext += `\n\nDescription: ${taskDescription.trim()}`;
  }
  
  const prompt = `Estimate how long in minutes the following task will take: "${taskContext}". 
Choose from these common durations: 15, 30, 45, 60, 90, 120, 180, 240, 300, 360 (6 hours max).
For most tasks, choose between 15-60 minutes. Only use longer durations (90+ minutes) for complex tasks like:
- Detailed analysis or research
- Creating comprehensive presentations or documents
- Complex coding projects
- Deep work sessions
- Workshop preparation
- Major project work

Consider both the task title and description (if provided) to make a more accurate estimate.
Respond with just one number representing the minutes.`;
  
  if (!key) {
    console.warn('Gemini API key not set');
    return 30;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ 
          role: 'user', 
          parts: [{ text: prompt }] 
        }]
      })
    });

    if (!res.ok) {
      console.error('Gemini API error:', res.status, res.statusText);
      return 30;
    }

    const data = await res.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      console.warn('No candidates returned from Gemini API');
      return 30;
    }

    const text = data.candidates[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\d+/);
    const minutes = match ? parseInt(match[0], 10) : NaN;
    
    // Expanded duration options: 15min to 6 hours
    const validDurations = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360];
    
    if (validDurations.includes(minutes)) {
      return minutes;
    }
    
    // If the estimated time is not in our valid durations, find the closest match
    if (!isNaN(minutes) && minutes > 0) {
      const closest = validDurations.reduce((prev, curr) => 
        Math.abs(curr - minutes) < Math.abs(prev - minutes) ? curr : prev
      );
      console.log(`Gemini estimated ${minutes} minutes, using closest valid duration: ${closest} minutes`);
      return closest;
    }
    
    console.warn('Invalid duration returned from Gemini:', text);
    return 30;
    
  } catch (e) {
    console.error('Gemini API error:', e);
    return 30;
  }
}
