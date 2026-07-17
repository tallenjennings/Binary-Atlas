export function bytesToBinary(bytes:Uint8Array):string{return [...bytes].map(b=>b.toString(2).padStart(8,'0')).join('')}
export function hexToBinary(hex:string):string{return [...hex].map(c=>parseInt(c,16).toString(2).padStart(4,'0')).join('')}
export async function sha256Bytes(data:ArrayBuffer|Uint8Array):Promise<{hex:string;binary:string}>{const source=data instanceof Uint8Array?data.slice().buffer:data;const digest=await crypto.subtle.digest('SHA-256',source);const bytes=new Uint8Array(digest);const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return{hex,binary:bytesToBinary(bytes)}}
export function utf8ToBytes(text:string):Uint8Array{return new TextEncoder().encode(text)}
