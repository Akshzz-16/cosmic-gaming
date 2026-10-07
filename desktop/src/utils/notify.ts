/** Windows toast via Electron main process, with a browser fallback. */
export async function notify(title: string, body: string): Promise<void> {
  try {
    if (window.counterAPI) {
      await window.counterAPI.notify(title, body);
      return;
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {
    /* notifications are best-effort */
  }
}
