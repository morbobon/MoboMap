import http from 'http';import fs from 'fs';import path from 'path';
const root=process.argv[2]||'.',port=+(process.argv[3]||8787);
const t={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png'};
http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]==='/'?'/index.html':q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':t[path.extname(f)]||'application/octet-stream'});r.end(d)})}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:'+port));
