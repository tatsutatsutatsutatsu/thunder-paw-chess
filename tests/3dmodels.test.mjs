import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {createFigurineLibrary,opponentFacing} from '../lib/chess/three/figurines.ts';
test('twelve true volumetric models with correct color/type and shared clone geometry',()=>{
 const lib=createFigurineLibrary();
 for(const color of ['w','b'])for(const type of ['k','q','r','b','n','p']){
  const model=lib.create(type,color),clone=lib.create(type,color);model.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
  assert(size.x>.35&&size.y>.7&&size.z>.3,`${color}${type} must be a volumetric figurine`);
  assert.equal(model.userData.kind,type);assert.equal(model.userData.color,color);
  assert(model.children.length>=3&&model.children.length<=6);
  assert(model.children.every(m=>m.isMesh&&m.geometry.getAttribute('position').count>=3));
  assert(model.children.reduce((sum,m)=>sum+m.geometry.getAttribute('position').count,0)>1000);
  assert.equal(model.children[0].geometry,clone.children[0].geometry);
  assert.notEqual(model.position,clone.position);
 }
 lib.dispose();
});
test('color variants preserve total surface geometry',()=>{
 const lib=createFigurineLibrary();
 for(const type of ['k','q','r','b','n','p']){
  const count=c=>lib.create(type,c).children.reduce((sum,m)=>sum+m.geometry.getAttribute('position').count,0);
  assert.equal(count('w'),count('b'));
 }
 lib.dispose();
});

test('armies face toward the opposite starting rank independently of camera',()=>{
 const forward=new T.Vector3(0,0,1);
 const white=forward.clone().applyAxisAngle(new T.Vector3(0,1,0),opponentFacing('w'));
 const black=forward.clone().applyAxisAngle(new T.Vector3(0,1,0),opponentFacing('b'));
 assert(white.z<-.99);assert(black.z>.99);assert(white.dot(black)<-.99);
});

