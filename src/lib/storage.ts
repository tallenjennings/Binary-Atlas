import type { BinaryLocation } from './binaryAtlas';
export type Landmark={id:string;name:string;description:string;inputType:string;binary:string;key:string;level:number;coordinate:{angle:number;visualY:number;radius:number};thumbnail?:string;createdAt:string;exact:boolean;hash?:string};
const KEY='binary-atlas-landmarks';
export function loadLandmarks():Landmark[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
export function saveLandmarks(items:Landmark[]){localStorage.setItem(KEY,JSON.stringify(items))}
export function landmarkFromLocation(name:string,inputType:string,loc:BinaryLocation,exact=true,description='',thumbnail?:string,hash?:string):Landmark{return{id:crypto.randomUUID(),name,description,inputType,binary:loc.binary,key:loc.key.toString(),level:loc.level,coordinate:{angle:loc.sectorCentreRadians,visualY:loc.visualY,radius:loc.radius},thumbnail,createdAt:new Date().toISOString(),exact,hash}}
