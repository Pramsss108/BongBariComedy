import { buildApiUrl } from './queryClient';

export async function fetchTodayGreeting(): Promise<string | null> {
  try {
  const r = await fetch(buildApiUrl('/api/greeting/today'));
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.text === 'string' ? j.text : null;
  } catch {
    return null;
  }
}
