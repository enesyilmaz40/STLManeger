import fs from 'fs';
import path from 'path';
import { createBoxSTL } from '../tests/create-sample-stl.mjs';

const targetDir = path.resolve(process.argv[2] || './DemoLibrary');

console.log(`Demo 3D Model Kütüphanesi oluşturuluyor: ${targetDir}`);

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// 1. Hamamcan Projesi
console.log('• Hamamcan projesi oluşturuluyor...');
createBoxSTL(path.join(targetDir, 'Hamamcan/Hamamcan.stl'), 45, 60, 30);
fs.writeFileSync(path.join(targetDir, 'Hamamcan/Hamamcan.3mf'), '3MF Container Data');
fs.writeFileSync(
  path.join(targetDir, 'Hamamcan/Hamamcan.gcode'),
  '; Creality Print G-Code\nG28 ; Home\nM104 S210 ; Set Extruder Temp\nG1 Z15.0 F6000\n'
);

createBoxSTL(path.join(targetDir, 'Hamamcan/V2/Hamamcan_V2.stl'), 48, 65, 32);
fs.writeFileSync(path.join(targetDir, 'Hamamcan/V2/Hamamcan_V2.3mf'), '3MF V2 Data');

createBoxSTL(path.join(targetDir, 'Hamamcan/V3/Govde.stl'), 50, 70, 35);
createBoxSTL(path.join(targetDir, 'Hamamcan/V3/Kafa.stl'), 25, 25, 25);
createBoxSTL(path.join(targetDir, 'Hamamcan/V3/Kanat.stl'), 15, 80, 8);

// 2. Schwab Projesi
console.log('• Schwab projesi oluşturuluyor...');
createBoxSTL(path.join(targetDir, 'Schwab/Mekanizma.stl'), 80, 30, 20);
createBoxSTL(path.join(targetDir, 'Schwab/Final/Mekanizma_Final.stl'), 85, 32, 22);

// 3. Disli Projesi
console.log('• Disli projesi oluşturuluyor...');
createBoxSTL(path.join(targetDir, 'Disli/Disli.stl'), 60, 60, 12);
fs.writeFileSync(
  path.join(targetDir, 'Disli/Disli.gcode'),
  '; GCODE Disli Creality\nG28\nG1 X0 Y0 Z0.2\n'
);

console.log('✔ Demo 3D Model Kütüphanesi başarıyla oluşturuldu!');
console.log(`Uygulama içerisinden "Klasör Ekle" butonuna basarak bu dizini seçebilirsiniz: ${targetDir}`);

