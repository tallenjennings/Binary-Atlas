export type BinaryLocation={key:bigint;level:number;localIndex:bigint;binary:string;sectorStartRadians:number;sectorCentreRadians:number;sectorWidthRadians:number;radius:number;visualY:number};
export const DEFAULT_RADIUS=4;export const DEFAULT_LEVEL_SCALE=1.35;export const DEFAULT_RENDER_PRECISION=20;
const TWO_PI=Math.PI*2;const pow2=(n:number)=>1n<<BigInt(n);
export function validateBinary(binary:string){if(!binary||!/^[01]+$/.test(binary))throw new Error('Binary value must contain only 0 and 1 and cannot be empty.');}
export function validateKey(key:bigint){if(typeof key!=='bigint'||key<1n)throw new Error('Key must be an integer greater than or equal to 1.');}
export function getFirstKeyForLevel(level:number):bigint{if(!Number.isInteger(level)||level<1)throw new Error('Level must be a positive integer.');return pow2(level)-1n}
export function getLastKeyForLevel(level:number):bigint{return pow2(level+1)-2n}
export function bitLength(v:bigint):number{if(v<0n)throw new Error('bitLength requires a non-negative bigint.');return v===0n?0:v.toString(2).length}
export function getLevelFromKey(key:bigint):number{validateKey(key);return bitLength(key+1n)-1}
export function binaryToKey(binary:string):bigint{validateBinary(binary);return getFirstKeyForLevel(binary.length)+BigInt('0b'+binary)}
export function keyToBinary(key:bigint):string{validateKey(key);const level=getLevelFromKey(key);const local=key-getFirstKeyForLevel(level);return local.toString(2).padStart(level,'0')}
export function getApproximatePrefix(binary:string,precision:number):string{validateBinary(binary);if(!Number.isInteger(precision)||precision<1)throw new Error('Precision must be a positive integer.');return binary.slice(0,Math.min(binary.length,precision))}
export function fractionFromPrefix(binary:string,centre=false,precision=DEFAULT_RENDER_PRECISION):number{validateBinary(binary);const prefix=getApproximatePrefix(binary,precision);let num=Number(BigInt('0b'+prefix));let den=2**prefix.length;if(centre)num+=0.5;return num/den}
export function binaryToLocation(binary:string,radius=DEFAULT_RADIUS,levelScale=DEFAULT_LEVEL_SCALE,renderPrecision=DEFAULT_RENDER_PRECISION):BinaryLocation{validateBinary(binary);const level=binary.length;const local=BigInt('0b'+binary);const key=binaryToKey(binary);const start=TWO_PI*fractionFromPrefix(binary,false,renderPrecision);const centre=TWO_PI*fractionFromPrefix(binary,true,renderPrecision);const width=TWO_PI/(2**Math.min(level,renderPrecision));return{key,level,localIndex:local,binary,sectorStartRadians:start,sectorCentreRadians:centre,sectorWidthRadians:width,radius,visualY:levelScale*Math.log2(level+1)}}
export function keyToLocation(key:bigint):BinaryLocation{return binaryToLocation(keyToBinary(key))}
export function getParentKey(key:bigint):bigint|null{const b=keyToBinary(key);return b.length<=1?null:binaryToKey(b.slice(0,-1))}
export function getChildKeys(key:bigint):[bigint,bigint]{const b=keyToBinary(key);return[binaryToKey(b+'0'),binaryToKey(b+'1')]}
export function getSharedPrefixLength(a:string,b:string):number{validateBinary(a);validateBinary(b);let i=0;for(;i<Math.min(a.length,b.length)&&a[i]===b[i];i++);return i}
export function formatBigInt(value:bigint):string{return value.toString(10)}
export function radiansToDegrees(r:number){return r*180/Math.PI}
export function cylindricalPoint(loc:BinaryLocation){return{x:loc.radius*Math.cos(loc.sectorCentreRadians),y:loc.visualY,z:loc.radius*Math.sin(loc.sectorCentreRadians)}}
export function isAncestorPrefix(a:string,b:string){validateBinary(a);validateBinary(b);return b.startsWith(a)&&a.length<b.length}
export function angularSeparation(a:string,b:string,precision=DEFAULT_RENDER_PRECISION){const da=Math.abs(fractionFromPrefix(a,true,precision)-fractionFromPrefix(b,true,precision))*TWO_PI;return Math.min(da,TWO_PI-da)}
