import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = walkDir('src');

for (const file of files) {
  if (file.includes('crypto')) continue; 
  if (file.endsWith('api.ts')) continue;
  if (file.endsWith('store.ts')) continue;
  if (file.endsWith('main.tsx')) continue;

  let content = fs.readFileSync(file, 'utf-8');
  
  if (content.includes('fetch(')) {
    let changed = false;
    
    // Proper regex to match fetch('/api', fetch("/api", fetch(`/api
    const regex = /fetch\(\s*(['"`]\/api.*?['"`])/g;
    
    if (regex.test(content)) {
       content = content.replace(regex, 'apiFetch($1');
       changed = true;
    }

    if (changed || content.includes('apiFetch(')) {
       if (!content.includes('import { apiFetch }')) {
          const relativePath = path.relative(path.dirname(file), 'src/lib/api.ts').replace(/\\/g, '/').replace(/\.ts$/, '');
          content = `import { apiFetch } from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';\n` + content;
       }
       fs.writeFileSync(file, content);
    }
  }
}
