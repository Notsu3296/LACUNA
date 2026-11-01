const canvas = document.querySelector('#universe');
const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' });
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let quality = 'standard', motion = reduced.matches;
try { quality = localStorage.getItem('tsa.prototype.quality') || 'standard'; motion = localStorage.getItem('tsa.prototype.motion') === 'true' || reduced.matches; } catch {}
const $ = s => document.querySelector(s);
let progress = 0, currentProgress = 0, pointerX = .5, pointerY = .5, pointerActive = 0, visible = true, sector = 0;
const flight = { value: 0 };
const animator = window.gsap;
const vertex = `#version 300 es
in vec2 position; void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
uniform vec2 resolution; uniform vec2 pointer; uniform vec2 cameraShift; uniform float pointerActive; uniform float time; uniform float travel; uniform float moving; uniform float sector;
out vec4 outColor;
float revealFactor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float artifact(vec3 p,vec3 pos,float kind){
 vec3 q=p-pos; q.xy*=rot(.4+pos.z*.1); q.xz*=rot(.55);
 float core=kind<.5?length(q)-.19:(abs(q.x)+abs(q.y)+abs(q.z)-.30)*.58;
 float hoop=length(vec2(length(q.xy)-.34,q.z))-.018;
 vec3 v=q;v.yz*=rot(1.15);float hoop2=length(vec2(length(v.xy)-.27,v.z))-.014;
 return min(core,min(hoop,hoop2));
}
float boxShape(vec3 p,vec3 size){vec3 q=abs(p)-size;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float scene(vec3 p){
 float id=floor((p.y+2.5)/4.5); float y=mod(p.y+2.5,4.5)-2.25;float z=mod(p.z,40.);
 vec3 a=vec3(p.x+2.1-.55*sin(id*1.7),y-1.4*cos(id*.9),z-5.5); a.xy*=rot(id*.7);
 vec3 b=vec3(p.x-2.4-.4*cos(id),y+1.5*sin(id*.6),z-9.5); b.yz*=rot(.7+id*.4);
 float debris=min(boxShape(a,vec3(.55,.12,.35)),boxShape(b,vec3(.28,.65,.24)));
 vec3 c=vec3(p.x+1.8,y+2.0,z-15.);c.xz*=rot(.7);debris=min(debris,boxShape(c,vec3(.15,.9,.18)));
 vec3 local=p;local.z=mod(p.z,40.);
 float objects=artifact(local,vec3(1.05,.45,4.8),0.);
 objects=min(objects,artifact(local,vec3(-1.0,-4.5,6.3),1.));
 objects=min(objects,artifact(local,vec3(1.35,-9.0,7.2),1.));
 objects=min(objects,artifact(local,vec3(-1.15,-13.5,8.6),0.));
 if(sector>.5){
  float planet=length(vec3(p.x-5.2,p.y+2.4,local.z-10.))-5.2;
  vec3 spire=vec3(p.x+2.3,y+1.6,z-8.);spire.xz*=rot(.3);
  float monolith=boxShape(spire,vec3(.35,1.7,.35));
  debris=min(planet,monolith);
 }
 if(revealFactor>.08)return min(objects,debris);
 return debris;
}
vec3 normalAt(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 float clock=time*moving;
 float lens=1.-smoothstep(.045,.14,length((gl_FragCoord.xy-pointer*resolution)/resolution.y));lens*=pointerActive;
 revealFactor=lens;
 vec3 ro=vec3(cameraShift,travel*32.0);
 vec3 rd=normalize(vec3(uv*.98,1.));
 vec3 col=vec3(.008,.018,.023)+mix(vec3(.015,.04,.045),vec3(.12,.045,.16),sector)*exp(-length(uv)*1.1);
 if(sector>.5){float nebula=exp(-abs(uv.y+.25*sin(uv.x*3.)) * 5.);col+=vec3(.08,.028,.11)*nebula;}
 for(int i=0;i<12;i++){
  float depth=mod(float(i)*2.85-travel*32.,34.)+.5;
  vec2 q=uv*depth*.9+cameraShift; vec2 cell=floor(q*4.); vec2 f=fract(q*4.)-.5;
  float h=hash(cell+float(i)*21.); vec2 offset=vec2(hash(cell+float(i)*8.)-.5,hash(cell+float(i)*5.+3.)-.5)*.7;
  float star=1.-smoothstep(.01,.1,length(f-offset));
  col+=vec3(.35,.65,.63)*star*step(.986,h)*clamp(1.6/depth,0.,.8);
 }
 float t=.01,d=0.;for(int i=0;i<72;i++){vec3 p=ro+rd*t;d=scene(p);if(d<.003||t>28.)break;t+=max(d*.75,.01);}
 if(t<28.&&d<.01){vec3 p=ro+rd*t;vec3 n=normalAt(p);vec3 light=normalize(vec3(-.4,.7,-.8));float diffuse=max(dot(n,light),0.);float rim=pow(1.-max(dot(n,-rd),0.),3.);float angle=atan(p.y,p.x);float sweep=pow(max(0.,sin(angle*5.-clock*.9+p.z*.25)),12.);float etch=pow(max(0.,sin(p.y*22.+p.z*3.)),32.)*.15;vec3 metal=vec3(.055,.105,.105)+diffuse*vec3(.18,.28,.26)+rim*vec3(.12,.23,.21)+sweep*vec3(.04,.18,.15)+etch*vec3(.12,.28,.25);float fog=exp(-t*.085);col=mix(col,metal,fog);}
 float centerGlow=exp(-length(uv)*3.5);col+=vec3(.025,.07,.065)*centerGlow;
 vec2 scan=gl_FragCoord.xy/resolution.y;float grid=pow(max(0.,cos(scan.x*105.)),40.)+pow(max(0.,cos(scan.y*105.)),40.);
 vec3 revealed=col*2.6+vec3(.025,.13,.105)+grid*vec3(.02,.08,.06);
 col=mix(col,revealed,lens*.85);
 col*=1.-.25*smoothstep(.35,1.2,length(uv));
 outColor=vec4(pow(max(col,0.),vec3(.85)),1.);
}`;
let program, uniforms;
function setup(){
 if(!gl){$('#fallback').hidden=false;return;}
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);uniforms=Object.fromEntries(['resolution','pointer','cameraShift','pointerActive','time','travel','moving','sector'].map(n=>[n,gl.getUniformLocation(program,n)]));requestAnimationFrame(render);}catch(e){console.error(e);$('#fallback').hidden=false;}
}
const targets = [
 {x:1.05,y:.45,z:4.8,kind:'move'}, {x:-1,y:-4.5,z:6.3,kind:'record'},
 {x:1.35,y:-9,z:7.2,kind:'record'}, {x:-1.15,y:-13.5,z:8.6,kind:'move'}
];
const targetButtons=targets.map((target,index)=>{const button=document.createElement('button');button.className='object-target';button.type='button';button.setAttribute('aria-label',target.kind==='move'?'構造物を調べる：移動':'構造物を調べる：資料閲覧');button.innerHTML=`<span class="target-dot"></span><span class="target-label">${target.kind==='move'?'移動':'資料閲覧'} <b>↗</b></span>`;button.addEventListener('focus',()=>{const rect=button.getBoundingClientRect();pointerX=(rect.left+rect.width/2)/innerWidth;pointerY=1-(rect.top+rect.height/2)/innerHeight;pointerActive=1;});button.addEventListener('click',()=>{location.hash=target.kind==='move'?(sector?'sector-01':'sector-02'):`sector-0${sector+1}/record-01`;});$('#objects').append(button);return button;});
function render(ms){if(!gl||!program)return;if(visible){const ratio=Math.min(devicePixelRatio,quality==='high'?1:quality==='low'?.5:.75);const w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}currentProgress=flight.value;const clock=motion?0:ms/1000;const cx=.10*Math.sin(clock*.13)+(pointerActive?(pointerX-.5)*.5:0),cy=.08*Math.cos(clock*.17)+(pointerActive?(pointerY-.5)*.35:0)-currentProgress*15;const travel=sector*1.25;gl.uniform2f(uniforms.resolution,w,h);gl.uniform2f(uniforms.pointer,pointerX,pointerY);gl.uniform2f(uniforms.cameraShift,cx,cy);gl.uniform1f(uniforms.pointerActive,pointerActive);gl.uniform1f(uniforms.time,ms/1000);gl.uniform1f(uniforms.travel,travel);gl.uniform1f(uniforms.moving,motion?0:1);gl.uniform1f(uniforms.sector,sector);gl.drawArrays(gl.TRIANGLES,0,6);
 targets.forEach((target,i)=>{const dz=target.z;const x=innerWidth/2+(target.x-cx)/dz/.98*innerHeight;const y=innerHeight/2-(target.y-cy)/dz/.98*innerHeight;const shown=dz>1.2&&dz<19&&x>28&&x<innerWidth-28&&y>28&&y<innerHeight-28&&!$('#record').open;const button=targetButtons[i];button.hidden=!shown;if(shown){button.style.transform=`translate(${x}px, ${y}px) translate(-50%, -50%)`;const lit=pointerActive&&Math.hypot(x-pointerX*innerWidth,y-(1-pointerY)*innerHeight)<innerHeight*.13;const reveal=lit||button.matches(':focus-visible');button.classList.toggle('revealed',reveal);button.style.opacity=reveal?String(Math.min(1,Math.max(.42,5/dz))):'0';}});
 }requestAnimationFrame(render)}
function onScroll(){const max=document.documentElement.scrollHeight-innerHeight;progress=max>0?Math.max(0,Math.min(1,scrollY/max)):0;$('#progressBar').style.height=`${progress*100}%`;if(motion||!animator){if(animator)animator.killTweensOf(flight);flight.value=progress;}else{animator.to(flight,{value:progress,duration:.45,ease:'power2.out',overwrite:true});}}
addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);document.addEventListener('visibilitychange',()=>{visible=!document.hidden});
document.addEventListener('pointermove',e=>{pointerX=e.clientX/innerWidth;pointerY=1-e.clientY/innerHeight;pointerActive=1;const c=$('#cursorLight');c.style.left=`${e.clientX}px`;c.style.top=`${e.clientY}px`;c.classList.add('active')},{passive:true});
canvas.addEventListener('pointerdown',e=>{pointerX=e.clientX/innerWidth;pointerY=1-e.clientY/innerHeight;pointerActive=1;},{passive:true});
document.addEventListener('pointerleave',()=>{pointerActive=0;$('#cursorLight').classList.remove('active')});
$('#restart').addEventListener('click',()=>scrollTo({top:0,behavior:motion?'instant':'smooth'}));
$('#settingsBtn').addEventListener('click',()=>$('#settings').showModal());$('#quality').value=quality;$('#motion').checked=motion;
$('#quality').addEventListener('change',e=>{quality=e.target.value;try{localStorage.setItem('tsa.prototype.quality',quality)}catch{}});
let instrumentAnimation;
if(animator){instrumentAnimation=animator.timeline({repeat:-1,paused:motion}).to('.instrument-lines',{strokeDashoffset:-110,duration:8,ease:'none'}).to('.instrument-marks',{opacity:.2,duration:1.4,stagger:.2,yoyo:true,repeat:1},0);}
$('#motion').addEventListener('change',e=>{motion=e.target.checked;if(instrumentAnimation){if(motion)instrumentAnimation.pause();else instrumentAnimation.resume();}onScroll();try{localStorage.setItem('tsa.prototype.motion',String(motion))}catch{}});
function syncRoute(){const nextSector=location.hash.includes('sector-02')?1:0;const changed=nextSector!==sector;sector=nextSector;$('#sectorIndicator').hidden=!sector;const isRecord=location.hash.includes('/record-01');const record=$('#record');if(isRecord&&!record.open){record.showModal();if(animator&&!motion)animator.fromTo(record,{opacity:0,x:30},{opacity:1,x:0,duration:.55,ease:'power3.out'});$('#recordClose').focus();}else if(!isRecord&&record.open){if(animator)animator.killTweensOf(record);record.close();record.style.removeProperty('opacity');record.style.removeProperty('transform');}if(changed){if(animator)animator.killTweensOf(flight);scrollTo({top:0,behavior:'instant'});progress=0;currentProgress=0;flight.value=0;onScroll();if(!motion&&animator){animator.fromTo(canvas,{opacity:.15,filter:'blur(8px)'},{opacity:1,filter:'blur(0px)',duration:.8,ease:'power2.out',clearProps:'opacity,filter'});}else if(!motion){canvas.classList.remove('transitioning');void canvas.offsetWidth;canvas.classList.add('transitioning');}}}
$('#recordClose').addEventListener('click',()=>{location.hash=`sector-0${sector+1}`});$('#record').addEventListener('cancel',e=>{e.preventDefault();location.hash=`sector-0${sector+1}`});$('#sectorBack').addEventListener('click',()=>{location.hash='sector-01'});addEventListener('hashchange',syncRoute);
onScroll();syncRoute();setup();
