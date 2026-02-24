const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/Betancourt/Documents/Proyectos web/EduBeta/edubeta/src/pages/dashboard';

const brandingHeader = (title) => `
        <div className="px-1 mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
            BETASOFT
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            ${title}
          </h1>
        </div>`;

const files = [
  {
    name: 'Settings.tsx',
    pattern: /<div className="p-4 lg:p-8 space-y-6 max-w-2xl">/,
    replacement: (match) => match + brandingHeader('Configuración')
  },
  {
    name: 'InstitutionalInfo.tsx',
    pattern: /<div className="space-y-6 p-6 pb-24 lg:pb-6 max-w-5xl mx-auto h-full overflow-y-auto">/,
    replacement: (match) => match + brandingHeader('Caracterización')
  },
  {
    name: 'AttendanceHistory.tsx',
    pattern: /(<div className="px-5) py-4 (bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800">)/,
    replacement: (match, p1, p2) => `${p1} pt-8 pb-4 ${p2}
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
            BETASOFT
          </p>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            Historial de Asistencia
          </h1>
        </div>`
  }
];

files.forEach(file => {
  const filePath = path.join(baseDir, file.name);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (file.pattern.test(content)) {
      content = content.replace(file.pattern, file.replacement);
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${file.name}`);
    } else {
      console.log(`Pattern not found in ${file.name}`);
    }
  } else {
    console.log(`File not found: ${file.name}`);
  }
});
