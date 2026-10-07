import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('counterAPI', {
  notify: (title: string, body: string): Promise<boolean> =>
    ipcRenderer.invoke('notify', title, body),
});
