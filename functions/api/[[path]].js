const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const corsHeaders={'content-type':'application/json; charset=utf-8'};
function safeText(v,max=300){return String(v??'').trim().slice(0,max)}
export async function onRequest({request,env}) {
  const url=new URL(request.url), path=url.pathname.replace(/^\/api\/?/,'');
  if(request.method==='OPTIONS')return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,DELETE,OPTIONS','access-control-allow-headers':'content-type'}});
  if(!env.DB)return json({error:'Database binding DB is missing. Follow the D1 setup guide.'},500);
  try {
    if(path==='health'&&request.method==='GET')return json({ok:true,service:'brilliantine-api'});
    if(path==='feed'&&request.method==='GET'){
      const r=await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      if(!r.ok)throw new Error('Feed provider unavailable');
      const ids=(await r.json()).slice(0,18);
      const items=await Promise.all(ids.map(async id=>{try{const x=await (await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)).json();return x&&x.title?{id:x.id,title:x.title,url:x.url||`https://news.ycombinator.com/item?id=${x.id}`,by:x.by,score:x.score,descendants:x.descendants}:null}catch{return null}}));
      return json({items:items.filter(Boolean)});
    }
    if(path==='reddit'&&request.method==='GET'){
      const subreddit=safeText(url.searchParams.get('subreddit')||'technology',40).replace(/[^a-zA-Z0-9_]/g,'');
      const r=await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=18`,{headers:{'user-agent':'BrilliantineWeb/1.0 (public feed reader)'}});
      if(!r.ok)throw new Error('Reddit feed is temporarily unavailable; Reddit may limit automated requests.');
      const d=await r.json();
      const items=(d.data?.children||[]).map(v=>v.data).filter(x=>x&&!x.stickied).map(x=>({id:x.id,title:x.title,url:x.url_overridden_by_dest||`https://www.reddit.com${x.permalink}`,by:x.author,score:x.score,descendants:x.num_comments,subreddit:x.subreddit}));
      return json({items});
    }
    if(path==='music'&&request.method==='GET'){
      const q=safeText(url.searchParams.get('q'),100);if(!q)return json({results:[]});
      const r=await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=18`);
      if(!r.ok)throw new Error('Music catalogue unavailable');
      const d=await r.json();return json({results:(d.results||[]).map(x=>({trackName:x.trackName,artistName:x.artistName,collectionName:x.collectionName,artworkUrl100:x.artworkUrl100,previewUrl:x.previewUrl,trackViewUrl:x.trackViewUrl}))});
    }
    if(path==='activity'&&request.method==='GET'){
      const {results}=await env.DB.prepare('SELECT id,type,title,url,created_at FROM activity ORDER BY id DESC LIMIT 12').all();return json({items:results});
    }
    if(path==='activity'&&request.method==='POST'){
      const b=await request.json();const type=safeText(b.type,30),title=safeText(b.title,250),link=safeText(b.url,1000);
      await env.DB.prepare('INSERT INTO activity(type,title,url) VALUES(?,?,?)').bind(type,title,link).run();return json({ok:true});
    }
    if(path==='saved'&&request.method==='GET'){
      const {results}=await env.DB.prepare('SELECT id,title,url,source,created_at FROM bookmarks ORDER BY id DESC LIMIT 100').all();return json({items:results});
    }
    if(path==='saved'&&request.method==='POST'){
      const b=await request.json(),title=safeText(b.title,250),link=safeText(b.url,1000),source=safeText(b.source,80);
      let parsed;try{parsed=new URL(link)}catch{return json({error:'A valid URL is required.'},400)}
      if(!['http:','https:'].includes(parsed.protocol))return json({error:'Only HTTP and HTTPS links can be saved.'},400);
      if(!title||!link)return json({error:'Title and URL are required.'},400);
      await env.DB.prepare('INSERT OR IGNORE INTO bookmarks(title,url,source) VALUES(?,?,?)').bind(title,parsed.href,source).run();return json({ok:true});
    }
    const del=path.match(/^saved\/(\d+)$/);
    if(del&&request.method==='DELETE'){await env.DB.prepare('DELETE FROM bookmarks WHERE id=?').bind(Number(del[1])).run();return json({ok:true})}
    return json({error:'Not found'},404);
  }catch(e){return json({error:e.message||'Unexpected server error'},500)}
}
