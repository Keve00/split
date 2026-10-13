/* Development preview with static files only, matching a GitHub Pages subpath. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
function createStaticServer(base='/'){
  if(!base.startsWith('/')||!base.endsWith('/'))throw Error('Base path must start and end with /.');
  return http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith(base)||!['GET','HEAD'].includes(req.method)){res.writeHead(404).end();return;}
    let relative;
    try{relative=decodeURIComponent(url.pathname.slice(base.length))||'index.html';}catch{res.writeHead(400).end();return;}
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain'};
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
}
if(require.main===module){const port=Number(process.env.PORT||8001),base=process.env.BASE_PATH||'/';createStaticServer(base).listen(port,'127.0.0.1',()=>console.log(`Static preview: http://127.0.0.1:${port}${base}`));}
module.exports={createStaticServer};
