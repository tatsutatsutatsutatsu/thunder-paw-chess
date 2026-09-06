import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as T from 'three';
import {createFigurineLibrary} from '../lib/chess/three/figurines.ts';
test('twelve true volumetric models with correct color/type and shared clone geometry',()=>{
 const lib=createFigurineLibrary();
 for(const color of ['w','b'])for(const type of ['k','q','r','b','n','p']){
  const model=lib.create(type,color),clone=lib.create(type,color);model.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
  assert(size.x>.35&&size.y>.7&&size.z>.3,`${color}${type} must be a volumetric figurine`);
  assert.equal(model.userData.kind,type);assert.equal(model.userData.color,color);
  assert(model.children.length>=3&&model.children.length<=6);
  assert(model.children.every(m=>m.isMesh&&m.geometry.getAttribute('position').count>100));
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
