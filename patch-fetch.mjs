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
  
  if (content.includes('fetch(') || content.includes('fetch (`')) {
    // We only replace fetch inside our own code calling /api/
    // Let's replace 'await fetch(' with 'await apiFetch(' and add import if not exists
    let changed = false;
    
    // Auth.tsx has a fetch that doesn't strictly need auth for login, but it's fine
    // Ticker uses 'fetch('https://api.binance.com' which we will exclude manually
    
    content = content.replace(/fetch\((`\/api|\('\/api|"\/api)/g, 'apiFetch($1');
    content = content.replace(/fetch\(\s*(`\/api|\('\/api|"\/api)/g, 'apiFetch($1');

    if (content.includes('apiFetch(') && !content.includes('apiFetch')) {
       // but we just checked if it has apiFetch
    }
    
    if (content.includes('apiFetch(') && !content.includes('import { apiFetch }')) {
       // calculate relative path to api.ts
       const relativePath = path.relative(path.dirname(file), 'src/lib/api.ts').replace(/\\/g, '/').replace(/\.ts$/, '');
       content = `import { apiFetch } from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';\n` + content;
       changed = true;
    }
    
    if (changed || content.includes('apiFetch(')) {
       fs.writeFileSync(file, content);
    }
  }
}
