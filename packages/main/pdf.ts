import { app, dialog, type BrowserWindow } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pdfFilename } from '../shared/pdf';

export interface SavePdfResult {
  saved: boolean;
  path?: string;
  error?: string;
}

export async function savePdfBuffer(
  data: Buffer,
  suggestedName: string,
  parent?: BrowserWindow | null,
): Promise<SavePdfResult> {
  const name = pdfFilename(suggestedName, '');
  const options: Electron.SaveDialogOptions = {
    title: 'Save page as PDF',
    defaultPath: path.join(app.getPath('documents'), name),
    filters: [{ name: 'PDF document', extensions: ['pdf'] }],
  };
  const result = parent ? await dialog.showSaveDialog(parent, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return { saved: false };

  const filePath = /\.pdf$/i.test(result.filePath) ? result.filePath : `${result.filePath}.pdf`;
  try {
    await fs.writeFile(filePath, data);
    return { saved: true, path: filePath };
  } catch (error) {
    return { saved: false, error: error instanceof Error ? error.message : 'Could not write the PDF.' };
  }
}
