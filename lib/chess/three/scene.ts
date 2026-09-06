import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFigurineLibrary } from './figurines';
import type { Chess, Square, Move } from 'chess.js';
export type BoardState={game:Chess;selected:Square|null;legal:Square[];last:Move|null;flipped:boolean;disabled:boolean};
export const squarePosition=(s:Square)=>new T.Vector3(s.charCodeAt(0)-100.5,.035,4.5-Number(s[1]));
export function createChessScene(host:HTMLDivElement,onSquare:(s:Square)=>void,onFailure:()=>void){
 const scene=new T.Scene();scene.background=new T.Color('#e9e4d9');
 const camera=new T.OrthographicCamera(-5,5,5,-5,.1,70);
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.98;
 renderer.domElement.setAttribute('aria-label','回転・拡大できる3Dチェス盤');renderer.domElement.setAttribute('data-testid','chess-canvas');host.insertBefore(renderer.domElement,host.firstChild);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.enablePan=false;controls.minPolarAngle=.12;controls.maxPolarAngle=1.16;controls.minZoom=.8;controls.maxZoom=2.3;controls.rotateSpeed=.65;controls.zoomSpeed=.8;controls.target.set(0,.1,0);
 const library=createFigurineLibrary();const figures=new T.Group();scene.add(figures);const board=new T.Group();scene.add(board);const highlights=new T.Group();scene.add(highlights);
 const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],textures:T.Texture[]=[];
 function mat(color:string,roughness=.8,metalness=0){const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;}
 function mesh(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,parent:T.Group|T.Scene=board){geometries.push(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;}
 const darkTile=mat('#737c70'),lightTile=mat('#dcd0b8'),stone=mat('#b7a688'),edge=mat('#494c40'),gold=mat('#b3965b',.4,.65);
 mesh(new RoundedBoxGeometry(8.72,.32,8.72,3,.13),edge,0,-.23,0);mesh(new RoundedBoxGeometry(8.58,.06,8.58,2,.08),gold,0,-.095,0);mesh(new RoundedBoxGeometry(8.5,.12,8.5,3,.08),stone,0,-.065,0);
 const tiles:T.Object3D[]=[];
 for(let r=0;r<8;r++)for(let f=0;f<8;f++){
  const tile=mesh(new T.BoxGeometry(.997,.065,.997),(r+f)%2===0?lightTile:darkTile,f-3.5,-.008,r-3.5);tile.userData.square=`${'abcdefgh'[f]}${8-r}`;tiles.push(tile);
 }
 // Coordinate lettering is part of the board, visible from any camera angle.
 function label(text:string,x:number,z:number,rotation=0){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,64,64);ctx.font='40px Georgia';ctx.fillStyle='#534833';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,32,32);const texture=new T.CanvasTexture(c);textures.push(texture);const material=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});materials.push(material);const o=mesh(new T.PlaneGeometry(.19,.19),material,x,.022,z);o.rotation.set(-Math.PI/2,0,rotation);}
 for(let i=0;i<8;i++){label('abcdefgh'[i],i-3.5,4.15);label('abcdefgh'[i],i-3.5,-4.15,Math.PI);label(String(8-i),-4.15,i-3.5,-Math.PI/2);label(String(8-i),4.15,i-3.5,Math.PI/2);}
 const ground=mesh(new T.PlaneGeometry(200,200),mat('#e9e4d9'),0,-.41,0,scene);ground.rotation.x=-Math.PI/2;
 scene.add(new T.HemisphereLight('#fff5df','#888d86',1.8));
 const sun=new T.DirectionalLight('#fff1d4',2.2);sun.position.set(-4,10,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-6;sun.shadow.normalBias=.045;sun.shadow.bias=-.0003;sun.shadow.radius=3;scene.add(sun);
 const fill=new T.DirectionalLight('#dfe8f6',1.3);fill.position.set(5,5,-4);scene.add(fill);
 let dirty=true,state:BoardState|undefined,fen='',lastKey='',flipped=false,disposed=false,frame=0;
 let pieces=new Map<Square,T.Group>();
 const animations:{piece:T.Group;from:T.Vector3;to:T.Vector3;start:number}[]=[];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let sparks:{points:T.Points;start:number;origin:T.Vector3}|null=null;
 const selectionMaterial=new T.MeshBasicMaterial({color:'#f2c568',transparent:true,opacity:.92,depthWrite:false});const recentMaterial=new T.MeshBasicMaterial({color:'#e4c77a',transparent:true,opacity:.36,depthWrite:false});const checkMaterial=new T.MeshBasicMaterial({color:'#d55b43',transparent:true,opacity:.82,depthWrite:false});const dotMaterial=new T.MeshBasicMaterial({color:'#eac66e',transparent:true,opacity:.88,depthWrite:false});materials.push(selectionMaterial,recentMaterial,checkMaterial,dotMaterial);
 const ringGeometry=new T.RingGeometry(.38,.46,48),dotGeometry=new T.CircleGeometry(.1,24),tileGeometry=new T.PlaneGeometry(.94,.94);geometries.push(ringGeometry,dotGeometry,tileGeometry);
 function mark(square:Square,geometry:T.BufferGeometry,material:T.Material){const p=squarePosition(square),o=new T.Mesh(geometry,material);o.position.set(p.x,.035,p.z);o.rotation.x=-Math.PI/2;highlights.add(o);}
 function resetView(){camera.position.set(flipped?.5:-.5,16,flipped?-10.5:10.5);camera.zoom=1;camera.lookAt(controls.target);camera.updateProjectionMatrix();controls.update();dirty=true;}
 resetView();
 const resize=()=>{const width=host.clientWidth,height=host.clientHeight,aspect=width/height;camera.left=-5.25*aspect;camera.right=5.25*aspect;camera.top=5.25;camera.bottom=-5.25;camera.updateProjectionMatrix();renderer.setSize(width,height);dirty=true;};
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const change=()=>{dirty=true;};controls.addEventListener('change',change);
 function emitSparks(square:Square){if(reduced)return;if(sparks){scene.remove(sparks.points);sparks.points.geometry.dispose();(sparks.points.material as T.Material).dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(18*3),3));const m=new T.PointsMaterial({color:'#f7d17c',size:.085,transparent:true,depthWrite:false});const points=new T.Points(g,m);scene.add(points);sparks={points,start:performance.now(),origin:squarePosition(square)};}
 function update(next:BoardState){
  state=next;if(flipped!==next.flipped){flipped=next.flipped;resetView();}
  const nextFen=next.game.fen(),key=next.last?next.last.before+next.last.san:'';
  if(nextFen!==fen){
   animations.length=0;const newPieces=new Map<Square,T.Group>();const isMove=!!next.last&&key!==lastKey&&fen===next.last.before;
   const transfers=new Map<Square,Square>();if(isMove){transfers.set(next.last!.to,next.last!.from);if(next.last!.isKingsideCastle())transfers.set(`f${next.last!.from[1]}` as Square,`h${next.last!.from[1]}` as Square);if(next.last!.isQueensideCastle())transfers.set(`d${next.last!.from[1]}` as Square,`a${next.last!.from[1]}` as Square);}
   for(const row of next.game.board())for(const p of row)if(p){
    const source=transfers.get(p.square)||p.square;let figure=pieces.get(source);if(figure?.userData.kind!==p.type||figure?.userData.color!==p.color)figure=undefined;
    if(figure)pieces.delete(source);else figure=library.create(p.type,p.color);
    figure.userData.square=p.square;figure.rotation.y=flipped?Math.PI:0;
    const to=squarePosition(p.square);
    if(isMove&&source!==p.square&&!reduced){const from=squarePosition(source);figure.position.copy(from);animations.push({piece:figure,from,to,start:performance.now()});}else figure.position.copy(to);
    figures.add(figure);newPieces.set(p.square,figure);
   }
   for(const old of pieces.values())figures.remove(old);pieces=newPieces;
   if(isMove&&next.last!.captured)emitSparks(next.last!.to);
   fen=nextFen;lastKey=key;
  }
  for(const figure of pieces.values())figure.rotation.y=flipped?Math.PI:0;
  highlights.clear();if(next.last){mark(next.last.from,tileGeometry,recentMaterial);mark(next.last.to,tileGeometry,recentMaterial);}
  if(next.selected)mark(next.selected,ringGeometry,selectionMaterial);
  next.legal.forEach(s=>mark(s,next.game.get(s)?ringGeometry:dotGeometry,dotMaterial));
  if(next.game.isCheck())for(const row of next.game.board())for(const p of row)if(p?.type==='k'&&p.color===next.game.turn())mark(p.square,ringGeometry,checkMaterial);
  dirty=true;
 }
 const raycaster=new T.Raycaster(),pointer=new T.Vector2();let down:{x:number;y:number;id:number}|null=null,multitouch=false;const activePointers=new Set<number>();
 const onDown=(e:PointerEvent)=>{activePointers.add(e.pointerId);if(activePointers.size>1)multitouch=true;down={x:e.clientX,y:e.clientY,id:e.pointerId};};
 const onUp=(e:PointerEvent)=>{activePointers.delete(e.pointerId);const moved=!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6;const multi=multitouch;if(activePointers.size===0)multitouch=false;down=null;if(moved||multi||state?.disabled)return;const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...figures.children,...tiles],true);for(const hit of hits){let o:T.Object3D|null=hit.object;while(o&&!o.userData.square)o=o.parent;if(o?.userData.square){onSquare(o.userData.square as Square);break;}}};
 const onCancel=(e:PointerEvent)=>{activePointers.delete(e.pointerId);down=null;if(!activePointers.size)multitouch=false;};
 const lost=(e:Event)=>{e.preventDefault();onFailure();};
 renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onUp);renderer.domElement.addEventListener('pointercancel',onCancel);renderer.domElement.addEventListener('webglcontextlost',lost);
 const projected=new T.Vector3();
 function render(){if(disposed)return;frame=requestAnimationFrame(render);if(document.hidden)return;controls.update();const now=performance.now();
  for(let i=animations.length-1;i>=0;i--){const a=animations[i],t=Math.min(1,(now-a.start)/280),ease=1-(1-t)**3;a.piece.position.lerpVectors(a.from,a.to,ease);a.piece.position.y+=Math.sin(t*Math.PI)*.12;if(t===1)animations.splice(i,1);dirty=true;}
  if(sparks){const t=(now-sparks.start)/600;if(t>=1){scene.remove(sparks.points);sparks.points.geometry.dispose();(sparks.points.material as T.Material).dispose();sparks=null;}else{const p=sparks.points.geometry.getAttribute('position');for(let i=0;i<18;i++){const a=i*2.399;p.setXYZ(i,sparks.origin.x+Math.cos(a)*t*.65,sparks.origin.y+.15+Math.sin(t*Math.PI)*(.2+(i%4)*.08),sparks.origin.z+Math.sin(a)*t*.65);}p.needsUpdate=true;(sparks.points.material as T.PointsMaterial).opacity=1-t;}dirty=true;}
  if(dirty){renderer.render(scene,camera);host.dataset.zoom=String(camera.zoom);host.dataset.camera=camera.position.toArray().join(',');host.dataset.frustum=[camera.left,camera.right,camera.top,camera.bottom].join(',');host.dataset.meshes=String(renderer.info.render.calls);host.dataset.triangles=String(renderer.info.render.triangles);
   // Expose current projected square positions for keyboard focus indicators.
   host.querySelectorAll<HTMLButtonElement>('[data-square]').forEach(b=>{const s=b.dataset.square as Square;projected.copy(squarePosition(s));projected.y=state?.game.get(s)?.type==='p'?.65:state?.game.get(s)?.type?.72:.045;projected.project(camera);b.style.left=`${(projected.x+1)*50}%`;b.style.top=`${(1-projected.y)*50}%`;});dirty=false;}
 }
 render();
 return{update,resetView,zoom:(delta:number)=>{camera.zoom=T.MathUtils.clamp(camera.zoom+delta,.8,2.3);camera.updateProjectionMatrix();dirty=true;},dispose:()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);renderer.domElement.removeEventListener('pointercancel',onCancel);renderer.domElement.removeEventListener('webglcontextlost',lost);if(sparks){sparks.points.geometry.dispose();(sparks.points.material as T.Material).dispose();}library.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();}};
}




