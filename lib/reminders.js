import * as Notifications from 'expo-notifications';

// naive in-memory cache for a cold start session
const scheduled = new Set();

export async function scheduleSessionReminders(sessions, minutesBefore = 120) {
  for (const s of sessions || []) {
    const key = `${s.id}`;
    if (scheduled.has(key)) continue;
    const start = new Date(s.start_at || s.start || s.startTime || s.date);
    if (!start || isNaN(+start)) continue;
    const trigger = new Date(start.getTime() - minutesBefore * 60 * 1000);
    if (trigger <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Upcoming session',
        body: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${s.title || s.mode || 'Session'}`
      },
      trigger
    });
    scheduled.add(key);
  }
}
