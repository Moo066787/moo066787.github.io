(() => {
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && 'IntersectionObserver' in window) {
    const reveal = [...document.querySelectorAll('.reveal')];
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, {threshold: 0.08});
    document.documentElement.classList.add('motion');
    reveal.forEach(el => observer.observe(el));
  }
  const toggle = $('#menu-toggle'), menu = $('#nav-links');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '关闭导航' : '展开导航');
    menu.classList.toggle('open', open);
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false');
  }));
  const top = $('#backtop');
  const updateTop = () => {if(top)top.hidden = window.scrollY < 500;};
  window.addEventListener('scroll', updateTop, {passive:true}); updateTop();
  top?.addEventListener('click', () => window.scrollTo({top:0, behavior:reduced?'auto':'smooth'}));
  const panel=$('#search-panel'), open=$('#search-open'), close=$('#search-close'), input=$('#search-input'), results=$('#search-results');
  let posts=null;
  const message = text => { results.replaceChildren(); const li=document.createElement('li');li.className='search-empty';li.textContent=text;results.append(li); };
  function render(){
    if(!posts)return;
    const term=input.value.trim().toLowerCase();
    const found=posts.filter(p=>[p.title,p.date,p.deck,p.summary].join(' ').toLowerCase().includes(term));
    results.replaceChildren();
    if(!found.length){message('暂时没有匹配的文章，试试 Web、TLS 或 Misc。');return;}
    for(const post of found){
      const li=document.createElement('li'), a=document.createElement('a'), small=document.createElement('small');
      a.href=post.url;a.textContent=post.title+' · '+post.deck;small.textContent=post.date;a.append(small);li.append(a);results.append(li);
    }
  }
  const closeSearch=()=>{panel.hidden=true;open.setAttribute('aria-expanded','false');open.focus();};
  open?.addEventListener('click',async()=>{
    if(!panel.hidden){closeSearch();return;}
    panel.hidden=false;open.setAttribute('aria-expanded','true');input.focus();
    if(posts){render();return;}
    message('正在加载文章…');
    try{const response=await fetch('/assets/posts.json');if(!response.ok)throw Error('load');posts=await response.json();render();}
    catch{message('文章列表暂时无法加载，请通过“归档”查看文章。');}
  });
  input?.addEventListener('input',render);close?.addEventListener('click',closeSearch);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)closeSearch();});
  panel?.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const elements=[...panel.querySelectorAll('input,button,a')];
    const first=elements[0], last=elements[elements.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  });
})();

/* Scroll-driven scenes: native scrolling, reversible progress, no wheel interception. */
(() => {
  const root=document.documentElement;
  const story=document.getElementById('scroll-story');
  const stage=document.querySelector('.story-stage');
  const phases=[...document.querySelectorAll('.story-phase')];
  const cards=[...document.querySelectorAll('.scrub-card')];
  const chapters=[...document.querySelectorAll('[data-chapter]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let queued=false;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const ease=n=>{n=clamp(n);return n*n*(3-2*n);};
  const range=(a,b,n)=>ease((n-a)/(b-a));
  function update(){
    queued=false;
    const y=window.scrollY, vh=window.innerHeight;
    if(!story)return;
    if(reduced.matches){
      root.classList.remove('story-enabled','scrub-ready');
      phases.forEach(node=>{node.inert=false;node.setAttribute('aria-hidden','false');node.style.removeProperty('opacity');node.style.removeProperty('transform');});
      return;
    }
    root.classList.add('story-enabled','scrub-ready');
    const bounds=story.getBoundingClientRect();
    const distance=Math.max(1,story.offsetHeight-stage.offsetHeight);
    const p=clamp(-bounds.top/distance);
    const opacity=[1-range(.18,.42,p),range(.32,.58,p)];
    const shifts=[-p*70,Math.max(0,.58-p)*90];
    const scales=[1+p*.12,1];
    phases.forEach((node,i)=>{
      node.style.opacity=opacity[i].toFixed(4);
      node.style.transform=`translate3d(0,${shifts[i].toFixed(2)}px,0) scale(${scales[i].toFixed(4)})`;
      const inactive=opacity[i]<.12;
      node.inert=inactive;
      node.setAttribute('aria-hidden',String(inactive));
    });
    const current=p<.4?0:1;
    chapters.forEach((btn,i)=>{btn.classList.toggle('active',i===current);btn.setAttribute('aria-current',i===current?'step':'false');});
    const past=clamp((y-story.offsetHeight)/(vh*.7));
    root.style.setProperty('--bg-scale',(1.04+p*.11+past*.02).toFixed(4));
    root.style.setProperty('--bg-blur',(range(.48,1,p)*2.5+past).toFixed(2)+'px');
    root.style.setProperty('--bg-brightness',(.82-p*.19-past*.08).toFixed(3));
    root.style.setProperty('--bg-shade',(.75+p*.2).toFixed(3));
    const mobile=window.innerWidth<=700;
    for(const card of cards){
      if(card.hidden)continue;
      const r=card.getBoundingClientRect();
      const t=ease((vh-r.top)/(vh*.64));
      const dir=Number(card.dataset.direction)||1;
      card.style.setProperty('--card-opacity',(.22+.78*t).toFixed(4));
      card.style.setProperty('--card-x',((1-t)*(mobile?10:38)*dir).toFixed(2)+'px');
      card.style.setProperty('--card-y',((1-t)*46).toFixed(2)+'px');
      card.style.setProperty('--card-scale',((mobile?.98:.95)+(mobile?.02:.05)*t).toFixed(4));
    }
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  document.addEventListener('journal-filter',schedule);
  reduced.addEventListener?.('change',schedule);
  chapters.forEach((btn,i)=>btn.addEventListener('click',()=>{
    const start=story.getBoundingClientRect().top+window.scrollY;
    const progress=[0,.86][i];
    window.scrollTo({top:start+(story.offsetHeight-stage.offsetHeight)*progress,behavior:reduced.matches?'auto':'smooth'});
  }));
  update();
})();

(() => {
  const buttons=[...document.querySelectorAll('[data-filter]')];
  const cards=[...document.querySelectorAll('.scrub-card')];
  const count=document.getElementById('filter-count');
  function filter(topic){
    let visible=0;
    cards.forEach(card=>{
      const show=topic==='all'||card.dataset.topics.split(' ').includes(topic);
      card.hidden=!show;if(show)visible++;
    });
    buttons.forEach(btn=>{const active=btn.dataset.filter===topic;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
    if(count)count.textContent=visible+' 篇记录';
    document.dispatchEvent(new Event('journal-filter'));
  }
  buttons.forEach(btn=>btn.addEventListener('click',()=>filter(btn.dataset.filter)));
  document.querySelectorAll('[data-set-filter]').forEach(link=>link.addEventListener('click',()=>filter(link.dataset.setFilter)));
})();

/* Contents navigation highlights the section actually being read. */
(() => {
  const links=[...document.querySelectorAll('.reading-toc nav a')];
  if(!links.length||!('IntersectionObserver' in window))return;
  const pairs=links.map(link=>({link,heading:document.getElementById(decodeURIComponent(link.hash.slice(1)))})).filter(p=>p.heading);
  const set=heading=>pairs.forEach(p=>{const active=p.heading===heading;p.link.classList.toggle('active',active);if(active)p.link.setAttribute('aria-current','location');else p.link.removeAttribute('aria-current');});
  pairs.forEach(p=>p.link.addEventListener('click',()=>set(p.heading)));
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting)set(entry.target);
  },{rootMargin:'-80px 0px -62% 0px',threshold:0});
  pairs.forEach(p=>observer.observe(p.heading));
  if(pairs.length)set(pairs[0].heading);
})();


/* Shared liquid material, one frame per pointer update; no perpetual render loop. */
(()=>{const panel='.personal-overview,.post-card,.article-content-panel,.reading-toc,.archive-list,.about-panel,.search-panel,.mobile-reading-toc';
const control='.overview-buttons a,.button,.nav-links a,.icon-button,.backtop,.toc-actions a,.topic-list a,.filter-tabs button,.feed-tabs button,.filter';
document.querySelectorAll(panel).forEach(el=>el.classList.add('liquid-panel'));
document.querySelectorAll(control).forEach(el=>el.classList.add('liquid-control'));
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');let frame=0,point=null,active=[];
const reset=()=>{cancelAnimationFrame(frame);frame=0;point=null;active.forEach(el=>{el.style.removeProperty('--glass-x');el.style.removeProperty('--glass-y')});active=[]};
document.addEventListener('pointermove',e=>{if(reduced.matches||!fine.matches)return;point={x:e.clientX,y:e.clientY,target:e.target};if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(!point)return;const found=[];let el=point.target.closest('.liquid-panel,.liquid-control');while(el){found.push(el);el=el.parentElement?.closest('.liquid-panel,.liquid-control')}
active.filter(el=>!found.includes(el)).forEach(el=>{el.style.removeProperty('--glass-x');el.style.removeProperty('--glass-y')});active=found;found.forEach(el=>{const b=el.getBoundingClientRect();el.style.setProperty('--glass-x',`${((point.x-b.left)/b.width*100).toFixed(1)}%`);el.style.setProperty('--glass-y',`${((point.y-b.top)/b.height*100).toFixed(1)}%`)})})},{passive:true});
let pressed=null;const release=()=>{pressed?.style.removeProperty('--liquid-scale');pressed=null};document.addEventListener('pointerdown',e=>{const el=e.target.closest('.liquid-control');if(el&&!reduced.matches){pressed=el;el.style.setProperty('--liquid-scale','.955')}},{passive:true});document.addEventListener('pointerup',release,{passive:true});document.addEventListener('pointercancel',release,{passive:true});window.addEventListener('blur',()=>{release();reset()});document.documentElement.addEventListener('pointerleave',reset);reduced.addEventListener('change',()=>{release();reset()});})();


/* Convex lens: magnify only the actual photo behind each glass boundary. */
(()=>{const root=document.documentElement;root.dataset.glass='clear';root.style.setProperty('--glass-blur','0px');root.style.setProperty('--glass-tint','.025');
const path=location.pathname;document.querySelectorAll('.nav-links a').forEach(a=>{if((path.includes('/archives')&&a.textContent==='归档')||(path==='/'&&a.textContent==='文章'))a.classList.add('current-page')});
const fallback=document.querySelector('.scene-background img');if(!fallback)return;
const sources=[...document.querySelectorAll('.article-cover-banner>img,.post-card .cover img')];
const selectors='.personal-overview,.post-card,.article-content-panel,.reading-toc,.archive-list,.search-panel,.nav,.overview-buttons a,.button,.backtop';
const entries=[...document.querySelectorAll(selectors)].map(el=>{const layer=document.createElement('span');layer.className='glass-magnifier';layer.setAttribute('aria-hidden','true');const image=document.createElement('img');image.alt='';image.draggable=false;layer.append(image);el.prepend(layer);return{el,layer,image,src:''}});
let queued=false;
function update(){queued=false;const vh=innerHeight,vw=innerWidth;const baseRect=fallback.getBoundingClientRect();const baseStyle=getComputedStyle(fallback);const candidates=sources.map(img=>({img,r:img.getBoundingClientRect()}));
for(const entry of entries){const {el,layer,image}=entry;const b=el.getBoundingClientRect();if(b.bottom<0||b.top>vh||b.right<0||b.left>vw||b.width<1||b.height<1||el.hidden||el.closest('[hidden]'))continue;
const x=b.left+b.width/2,y=b.top+b.height/2;let source=fallback,r=baseRect,style=baseStyle;
// Covers beneath floating navigation refract their own photo rather than the wallpaper.
if(el.matches('.nav,.button,.backtop'))for(const c of candidates)if(x>=c.r.left&&x<=c.r.right&&y>=c.r.top&&y<=c.r.bottom){source=c.img;r=c.r;style=getComputedStyle(source);break}
const url=source.currentSrc||source.src;if(entry.src!==url){image.src=url;entry.src=url}
const sx=b.width/(el.offsetWidth||b.width),sy=b.height/(el.offsetHeight||b.height);
const zoom=el.matches('.nav,.overview-buttons a,.button,.backtop')?1.24:1.12;
// Scaling about this lens centre creates an actual 12–24% larger background image.
image.style.width=(r.width*zoom/sx)+'px';image.style.height=(r.height*zoom/sy)+'px';image.style.left=(((r.left-b.left)*zoom-b.width*(zoom-1)/2)/sx)+'px';image.style.top=(((r.top-b.top)*zoom-b.height*(zoom-1)/2)/sy)+'px';
image.style.objectFit=style.objectFit;image.style.objectPosition=style.objectPosition;image.style.filter=style.filter.replace(/blur\([^)]*\)/g,'')+' blur(3px)';
}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(update)}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});addEventListener('pageshow',schedule);document.addEventListener('journal-filter',schedule);document.getElementById('search-open')?.addEventListener('click',schedule);
[fallback,...sources].forEach(img=>{if(!img.complete)img.addEventListener('load',schedule,{once:true})});
if('ResizeObserver'in window){const ro=new ResizeObserver(schedule);entries.forEach(e=>ro.observe(e.el))}
// Recompute for the finite scroll transition, without an idle animation loop.
document.querySelectorAll('[data-chapter],a[href="#about"],a[href="/#about"]').forEach(el=>el.addEventListener('click',schedule));
schedule();})();
