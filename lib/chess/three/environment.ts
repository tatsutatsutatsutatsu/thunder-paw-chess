import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/** A quiet, fully 3D tabletop setting, kept outside the playable board. */
export function createRoomBackdrop(){
 const group=new T.Group();group.name='warm-reading-room';
 const geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],textures:T.Texture[]=[];
 const material=(color:string,roughness=.85,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;};
 const walnut=material('#886345'),brass=material('#a78c56',.48,.58),ceramic=material('#d1c5ab'),leafMat=material('#67745a'),floorMat=material('#c8bca6'),wallMat=material('#d8ceba');
 // Subtle wood pores; deterministic and local, with no external asset requests.
 const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const wave=Math.sin(x*.16+Math.sin(y*.021)*2+Math.sin(x*.031)*2);const fine=Math.sin(x*2.8+Math.sin(y*.011)*3);const v=Math.round(180+wave*5+fine*2);const i=(y*size+x)*4;data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=255;}
 const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(3,1);texture.needsUpdate=true;textures.push(texture);walnut.map=texture;walnut.bumpMap=texture;walnut.bumpScale=.007;
 function mesh(geometry:T.BufferGeometry,m:T.Material,x:number,y:number,z:number){geometries.push(geometry);const o=new T.Mesh(geometry,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;}
 mesh(new RoundedBoxGeometry(14,.38,14,4,.18),walnut,0,-.6,0);
 mesh(new RoundedBoxGeometry(13.82,.04,13.82,2,.08),brass,0,-.795,0);
 const floor=mesh(new T.PlaneGeometry(100,100),floorMat,0,-3.55,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
 for(const x of [-5.9,5.9])for(const z of [-5.9,5.9])mesh(new T.CylinderGeometry(.12,.09,2.8,16),walnut,x,-2.16,z);
 // Low windowsill and a warm plaster wall appear at lower viewing angles.
 mesh(new T.BoxGeometry(24,7,.2),wallMat,0,-.05,-9);
 mesh(new RoundedBoxGeometry(7.6,.13,.75,2,.05),ceramic,-2,1.15,-8.6);
 const glass=new T.MeshStandardMaterial({color:'#e8eee0',emissive:'#dedfc7',emissiveIntensity:.22,roughness:.9});materials.push(glass);
 mesh(new T.BoxGeometry(7.2,3.2,.08),glass,-2,2.8,-8.84);
 for(const x of [-5.6,-2,1.6])mesh(new T.BoxGeometry(.1,3.35,.13),ceramic,x,2.8,-8.75);
 for(const y of [1.17,2.8,4.43])mesh(new T.BoxGeometry(7.35,.1,.13),ceramic,-2,y,-8.75);
 // A small plant and ceramic lamp frame the board without entering any square.
 const px=-4.9,pz=-4.8;
 mesh(new T.CylinderGeometry(.27,.21,.42,28),ceramic,px,-.2,pz);
 mesh(new T.CylinderGeometry(.23,.23,.024,28),material('#5e5140'),px,.02,pz);
 for(let i=0;i<7;i++){const a=i*2.399;const x=px+Math.cos(a)*.16,z=pz+Math.sin(a)*.15;mesh(new T.CylinderGeometry(.014,.018,.55,8),leafMat,x,.27,z);const leaf=mesh(new T.SphereGeometry(1,18,12),leafMat,x+Math.cos(a)*.12,.55+(i%3)*.085,z+Math.sin(a)*.12);leaf.scale.set(.11,.27,.055);leaf.rotation.set(.3, a,.4*Math.sin(a));}
 const lx=4.8,lz=-4.8;
 mesh(new T.CylinderGeometry(.25,.28,.07,28),brass,lx,-.37,lz);
 mesh(new T.CylinderGeometry(.033,.045,.7,18),brass,lx,.0,lz);
 mesh(new T.CylinderGeometry(.19,.4,.38,32),ceramic,lx,.52,lz);
 const lamp=new T.PointLight('#ffd9a0',1.1,3,2);lamp.position.set(lx,.4,lz);group.add(lamp);
 return{group,dispose:()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}

