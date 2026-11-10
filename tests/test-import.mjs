import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createBoxSTL } from './create-sample-stl.mjs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distElectronPath = path.resolve(__dirname, '../dist-electron');

const {
  initDatabase,
  closeDatabase,
  getLibraryRoots,
  addLibraryRoot,
  getProjects,
  getFoldersByProject,
  getFiles,
  getFileById,
  updateProjectDescription,
  updateFolderDescription,
  updateFileDescription,
  addTagToFile,
} = require(path.join(distElectronPath, 'main.js'));

// Wait! In main.js or db/index.js? Wait, main.js bundles db, scanner, etc!
// Let's check what main.js exports or what db/index.js exports.

