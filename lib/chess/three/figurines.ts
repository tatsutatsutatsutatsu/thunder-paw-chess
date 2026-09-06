import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Color, PieceSymbol } from 'chess.js';

/** Real volumetric figurines. No planes, image billboards or reference-image textures. */
export function createFigurineLibrary() {
 const noise=new Uint8Array(64*64*4);let seed=19;
 for(let i=0;i<noise.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const n=160+(seed%85);noise[i]=noise[i+1]=noise[i+2]=n;noise[i+3]=255;}
 const grain=new T.DataTexture(noise,64,64);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(3,3);grain.needsUpdate=true;
 const materials:{[key:string]:T.MeshStandardMaterial}={
  ivory:new T.MeshStandardMaterial({color:'#e7dcc4',roughness:.78,bumpMap:grain,bumpScale:.008}),
  charcoal:new T.MeshStandardMaterial({color:'#373d39',roughness:.72,bumpMap:grain,bumpScale:.009}),
  gold:new T.MeshStandardMaterial({color:'#c5a052',metalness:.7,roughness:.32}),
  antique:new T.MeshStandardMaterial({color:'#ad8846',metalness:.64,roughness:.4}),
  ink:new T.MeshStandardMaterial({color:'#24251f',roughness:.48}),
  cream:new T.MeshStandardMaterial({color:'#f0e5ca',roughness:.62}),
 };
 const library=new Map<string,T.Group>();
 function build(type:PieceSymbol,color:Color){
  const parts=new Map<T.Material,T.BufferGeometry[]>();
  const body=color==='w'?materials.ivory:materials.charcoal,gold=color==='w'?materials.gold:materials.antique,ink=materials.ink,cream=materials.cream;
  const dark=color==='b';
  function add(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,scale:[number,number,number]=[1,1,1],rot:[number,number,number]=[0,0,0]){
   g.deleteAttribute('uv1');const o=new T.Object3D();o.position.set(x,y,z);o.scale.set(...scale);o.rotation.set(...rot);o.updateMatrix();g.applyMatrix4(o.matrix);
   // Normalize indexing so all primitive types can share a material/draw call.
   const normalized=g.index?g.toNonIndexed():g;if(normalized!==g)g.dispose();
   if(!parts.has(m))parts.set(m,[]);parts.get(m)!.push(normalized);
  }
  function ball(m:T.Material,x:number,y:number,z:number,sx:number,sy=sx,sz=sx){add(new T.SphereGeometry(1,24,16),m,x,y,z,[sx,sy,sz]);}
  function box(m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number,rz=0){add(new RoundedBoxGeometry(w,h,d,2,.025),m,x,y,z,[1,1,1],[0,0,rz]);}
  function cyl(m:T.Material,x:number,y:number,z:number,top:number,bottom:number,h:number){add(new T.CylinderGeometry(top,bottom,h,32),m,x,y,z);}
  function ring(m:T.Material,x:number,y:number,z:number,r:number,tube:number,rx=0){add(new T.TorusGeometry(r,tube,8,32),m,x,y,z,[1,1,1],[rx,0,0]);}
  function line(m:T.Material,a:number[],b:number[],radius:number){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const geom=new T.CylinderGeometry(radius,radius,delta.length(),10);const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());geom.applyQuaternion(q);const center=start.add(end).multiplyScalar(.5);add(geom,m,center.x,center.y,center.z);}
  function shape(m:T.Material,points:number[][],x:number,y:number,z:number,scale:number,depth=.035){const sh=new T.Shape();points.forEach(([a,b],i)=>i?sh.lineTo(a,b):sh.moveTo(a,b));sh.closePath();add(new T.ExtrudeGeometry(sh,{depth,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,steps:1}),m,x,y,z,[scale,scale,1]);}
  function bolt(x:number,y:number,z:number,size:number){shape(gold,[[.06,.14],[-.05,.14],[-.11,-.015],[-.015,-.015],[-.065,-.15],[.105,.055],[.02,.055]],x,y,z,size,.012);}
  // Low turned pedestal: body color and narrow gold inlays distinguish both armies.
  const base=type==='p'?.14:type==='r'?.2:.13;
  cyl(body,0,.04,0,.32,.34,.08);cyl(gold,0,.079,0,.319,.319,.014);cyl(body,0,base-.016,0,.275,.31,base-.075);cyl(gold,0,base+.004,0,.277,.277,.012);
  const lift=base-.12;
  if(type==='r'){
   cyl(body,0,.22,0,.3,.28,.18);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;box(body,Math.sin(a)*.285,.33,Math.cos(a)*.285,.1,.1,.1);}
   for(let j=0;j<3;j++)ring(gold,0,.16+j*.052,0,.283,.004,Math.PI/2);
  }
  const seated=type==='k',bodyY=.43+lift,headY=.8+lift;
  if(seated){
   // Solid throne with carved back, cushion, arms, legs and a gold crest.
   box(body,0,.57,-.21,.64,.88,.13);box(gold,0,1.015,-.212,.61,.022,.15);
   box(body,0,.29,.04,.65,.16,.48);box(gold,0,.377,.025,.49,.025,.35);
   for(const x of [-.285,.285]){box(body,x,.37,.06,.09,.49,.44);ball(gold,x,.64,.23,.036);box(body,x,.15,.2,.08,.22,.08);}
   bolt(0,.91,-.125,.6);
  }
  ball(body,0,bodyY,0,.205,.265,.165);
  for(const x of [-.125,.125]){ball(body,x,seated?.31+lift:.255+lift,.055,.09,.145,.095);ball(body,x,.19+lift,.11,.105,.059,.125);}
  // A curled, raised tail is visible when orbiting behind the collection.
  const tailCurve=new T.CatmullRomCurve3([new T.Vector3(.12,.31+lift,-.09),new T.Vector3(.27,.31+lift,-.18),new T.Vector3(.29,.46+lift,-.19),new T.Vector3(.24,.49+lift,-.19)]);
  add(new T.TubeGeometry(tailCurve,16,.034,8,false),body);
  ball(body,0,headY,0,.302,.282,.258);
  for(const x of [-.205,.205]){
   add(new T.ConeGeometry(.135,.235,3),body,x,headY+.228,-.008,[1,1,.72],[0,Math.PI/2,x<0?.25:-.25]);
   shape(gold,[[-.069,0],[.071,0],[0,.132]],x,headY+.178,.064,1,.016);
  }
  // Eye rings and actual inlaid round/X geometry sit on the curved face.
  for(const x of [-.115,.115]){
   ball(cream,x,headY+.005,.23,.087,.096,.033);
   ring(ink,x,headY+.005,.258,.073,.011);
  }
  ball(ink,-.115,headY+.005,.263,.055,.064,.019);
  ball(cream,-.132,headY+.034,.281,.012);
  line(ink,[.078,headY-.034,.274],[.152,headY+.044,.274],.012);
  line(ink,[.078,headY+.044,.274],[.152,headY-.034,.274],.012);
  bolt(0,headY+.166,.23,.48);
  const armY=.47+lift;
  for(const x of [-.225,.225])ball(body,x,armY,.025,.075,.165,.08);
  function crown(royal:boolean){
   const y=headY+.255;
   cyl(gold,0,y,0,.195,.18,.062);ring(gold,0,y+.029,0,.195,.013,Math.PI/2);
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4,x=Math.sin(a),z=Math.cos(a);
    if(royal){const c=new T.CatmullRomCurve3([new T.Vector3(x*.18,y+.02,z*.18),new T.Vector3(x*.21,y+.16,z*.21),new T.Vector3(x*.115,y+.23,z*.115),new T.Vector3(0,y+.24,0)]);add(new T.TubeGeometry(c,12,.012,6,false),gold);}
    else{line(gold,[x*.18,y+.02,z*.18],[x*.23,y+.21,z*.23],.011);ball(gold,x*.23,y+.217,z*.23,.025);}
    ball(dark?cream:gold,x*.185,y,z*.185,.014);
   }
   if(royal){ball(gold,0,y+.27,0,.04);line(gold,[0,y+.285,0],[0,y+.37,0],.014);line(gold,[-.036,y+.335,0],[.036,y+.335,0],.012);}
  }
  if(type==='q'){
   crown(false);line(gold,[-.33,.17,.08],[-.33,.96,.08],.018);ball(gold,-.33,.92,.08,.058);ring(gold,-.33,.92,.08,.075,.009);bolt(-.33,1.035,.085,.3);ball(body,-.267,.52,.1,.06);ring(gold,.25,.315,.1,.032,.009);line(gold,[.25,.29,.1],[.25,.2,.1],.011);box(gold,.265,.2,.1,.045,.018,.019);
  }
  if(type==='k')crown(true);
  if(type==='p'){
   // Guard cat: pointed sword in left paw and thick beveled shield in right.
   line(gold,[-.28,.46,.1],[-.35,.33,.14],.026);line(gold,[-.41,.39,.14],[-.26,.31,.14],.017);
   shape(body,[[-.07,0],[0,-.35],[.065,0],[0,.06]],-.43,.32,.13,1,.038);
   const shield=[[0,-.23],[-.14,-.11],[-.17,.17],[.16,.2],[.15,-.1]];
   shape(gold,shield,.277,.43,.145,1,.045);shape(body,shield,.277,.43,.197,.88,.025);bolt(.28,.46,.229,.6);ball(body,.245,.53,.1,.068);
  }
  if(type==='r'){
   // Held miniature fortress, plus the crenellated tower pedestal.
   box(body,0,.47+lift,.24,.245,.28,.17);box(gold,0,.455+lift,.332,.06,.10,.016);
   for(const x of [-.105,.105]){cyl(body,x,.54+lift,.235,.053,.055,.22);for(const dx of [-.035,.035])box(body,x+dx,.668+lift,.235,.035,.055,.082);}
   for(const x of [-.085,0,.085])box(body,x,.635+lift,.26,.051,.055,.11);
   ball(body,-.155,.5+lift,.22,.084,.09,.065);ball(body,.155,.5+lift,.22,.084,.09,.065);
  }
  if(type==='b'){
   const mitre=[[-.205,0],[-.19,.21],[0,.42],[.19,.21],[.205,0]];
   shape(body,mitre,0,headY+.22,-.065,1,.155);shape(gold,[[-.025,0],[-.025,.35],[0,.38],[.025,.35],[.025,0]],0,headY+.227,.096,1,.012);
   box(gold,0,headY+.242,.085,.4,.035,.04);
   for(const x of [-.1,.1])shape(gold,[[0,.055],[.035,0],[0,-.055],[-.035,0]],x,headY+.405,.096,1,.008);
   ball(body,-.095,.48,.17,.11,.09,.08);ball(body,.095,.48,.17,.11,.09,.08);ring(gold,0,.605,.176,.057,.016);ball(cream,0,.605,.185,.035);
  }
  if(type==='n'){
   // Rounded horse hood, protruding muzzle, horse ears and sculpted mane.
   add(new T.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.48),body,0,headY+.025,-.015,[.321,.29,.28]);
   ball(body,-.06,headY+.295,.01,.17,.195,.155);ball(body,-.185,headY+.286,.145,.185,.09,.105);
   for(const x of [-.11,.04])add(new T.ConeGeometry(.055,.13,4),body,x,headY+.495,-.015,[1,1,.6]);
   ball(ink,-.137,headY+.343,.14,.019);ball(gold,-.29,headY+.3,.203,.015);
   for(let i=0;i<5;i++)ball(gold,.04,headY+.425-i*.058,-.135,.048,.045,.028);
  }
  const group=new T.Group();group.name=`${color}-${type}`;
  for(const [material,geometries] of parts){const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!merged)throw Error('Unable to merge figurine geometry');merged.computeBoundingSphere();const mesh=new T.Mesh(merged,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}
  const size=type==='p'?.76:type==='r'?.87:type==='k'?.9:.9;group.scale.setScalar(size);
  group.userData.kind=type;group.userData.color=color;return group;
 }
 for(const c of ['w','b'] as Color[])for(const p of ['k','q','n','r','b','p'] as PieceSymbol[])library.set(`${c}${p}`,build(p,c));
 return {create:(type:PieceSymbol,color:Color)=>library.get(`${color}${type}`)!.clone(true),dispose:()=>{for(const g of library.values())g.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});Object.values(materials).forEach(m=>m.dispose());grain.dispose();}};
}

