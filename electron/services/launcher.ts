import { spawn } from 'child_process';
import { shell, clipboard } from 'electron';
import fs from 'fs';
import path from 'path';
import { getSetting } from '../db';

export class LauncherService {
  public async openInCrealityPrint(filePath: string): Promise<{ success: boolean; message?: string }> {
    const normFile = path.normalize(filePath);
    if (!fs.existsSync(normFile)) {
      return { success: false, message: `Dosya bulunamadı: ${normFile}` };
    }

    const exePath = getSetting('crealityPrintPath', '');
    if (!exePath || !fs.existsSync(exePath)) {
      return {
        success: false,
        message: 'Creality Print programı bulunamadı. Lütfen Ayarlar sayfasından Creality Print EXE yolunu kontrol edin.',
      };
    }

    try {
      // Spawn safely without shell string concatenation
      const child = spawn(exePath, [normFile], {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });
      child.unref();
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: `Creality Print başlatılırken hata oluştu: ${err.message || String(err)}`,
      };
    }
  }

  public async openWithDefaultApp(filePath: string): Promise<{ success: boolean; message?: string }> {
    const normFile = path.normalize(filePath);
    if (!fs.existsSync(normFile)) {
      return { success: false, message: `Dosya bulunamadı: ${normFile}` };
    }

    try {
      const err = await shell.openPath(normFile);
      if (err) {
        return { success: false, message: err };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || String(err) };
    }
  }

  public showInFolder(filePath: string): { success: boolean; message?: string } {
    const normFile = path.normalize(filePath);
    if (!fs.existsSync(normFile)) {
      return { success: false, message: `Dosya bulunamadı: ${normFile}` };
    }
    try {
      shell.showItemInFolder(normFile);
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || String(err) };
    }
  }

  public copyPathToClipboard(filePath: string): { success: boolean } {
    clipboard.writeText(path.normalize(filePath));
    return { success: true };
  }
}

export const launcherService = new LauncherService();

