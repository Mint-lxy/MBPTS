const fs = require('fs');
const https = require('https');
const path = require('path');

const mdPath = process.argv[2];
const outDir = process.argv[3];
const md = fs.readFileSync(mdPath, 'utf8');

const blocks = [];
const re = /```mermaid\r?\n([\s\S]*?)```/g;
let m;
while ((m = re.exec(md)) !== null) blocks.push(m[1]);

console.log('mermaid blocks found:', blocks.length);

function fetch(url, dest, redirects) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && (redirects||0) < 5) {
        res.resume();
        return resolve(fetch(res.headers.location, dest, (redirects||0)+1));
      }
      if (res.statusCode !== 200) {
        let body='';
        res.on('data', d=>body+=d);
        res.on('end', ()=>reject(new Error('HTTP '+res.statusCode+': '+body.slice(0,200))));
        return;
      }
      const ws = fs.createWriteStream(dest);
      res.pipe(ws);
      ws.on('finish', ()=>ws.close(resolve));
    }).on('error', reject);
  });
}

(async () => {
  for (let i = 0; i < blocks.length; i++) {
    const b64 = Buffer.from(blocks[i], 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `https://mermaid.ink/img/${b64}?type=png&bgColor=white&width=1800&scale=2`;
    const dest = path.join(outDir, `mermaid_${i+1}.png`);
    try {
      await fetch(url, dest);
      const sz = fs.statSync(dest).size;
      console.log(`mermaid_${i+1}.png OK (${sz} bytes)`);
    } catch (e) {
      console.log(`mermaid_${i+1}.png FAIL: ${e.message}`);
    }
  }
})();
