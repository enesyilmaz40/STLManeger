import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronThumbnailAPI', {
  onRenderRequest: (callback: (data: { id: number; buffer: ArrayBuffer }) => void) => {
    ipcRenderer.on('render-stl', (_event, data) => callback(data));
  },
  sendRenderSuccess: (data: {
    id: number;
    dataUrl: string;
    dims: { x: number; y: number; z: number };
    triangles: number;
    vertices: number;
  }) => {
    ipcRenderer.send('thumbnail-rendered', data);
  },
  sendRenderError: (data: { id: number; error: string }) => {
    ipcRenderer.send('thumbnail-error', data);
  },
});

