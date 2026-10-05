import pako from "pako";

export type ExecutableInspection = {
  isExecutable: boolean;
  kind: "pe"|"dll"|"unknown";
  validPe: boolean;
  architecture: "x86"|"x64"|"arm64"|"unknown";
  size: number;
  reasons: string[];
};

function u16(bytes: Uint8Array, o: number){ return bytes[o] | (bytes[o+1] << 8); }
function u32(bytes: Uint8Array, o: number){ return (bytes[o] | (bytes[o+1]<<8) | (bytes[o+2]<<16) | (bytes[o+3]<<24)) >>> 0; }

export async function inspectExecutable(file: File): Promise<ExecutableInspection>{
  const size=file.size;
  const head=new Uint8Array(await file.slice(0, Math.min(size, 8192)).arrayBuffer());
  const reasons:string[]=[];
  const extension=/\.(exe|dll|scr|com|msi)$/i.test(file.name);
  const mz=head.length>=2 && head[0]===0x4d && head[1]===0x5a;
  if(!mz){
    return {
      isExecutable:extension,
      kind:"unknown",
      validPe:false,
      architecture:"unknown",
      size,
      reasons: extension
        ? ["L’extension indique un fichier exécutable, mais l’en-tête Windows MZ n’a pas été trouvé."]
        : ["Le fichier ne présente pas l’en-tête PE Windows attendu."]
    };
  }
  if(head.length<0x40){
    return {isExecutable:true,kind:"unknown",validPe:false,architecture:"unknown",size,reasons:["En-tête MZ présent mais fichier trop court pour vérifier sa structure PE."]};
  }
  const peOffset=u32(head,0x3c);
  const pe=peOffset+4<=head.length && head[peOffset]===0x50 && head[peOffset+1]===0x45 && head[peOffset+2]===0x00 && head[peOffset+3]===0x00;
  if(!pe){
    return {isExecutable:true,kind:"unknown",validPe:false,architecture:"unknown",size,reasons:["En-tête MZ présent, mais la signature PE\\0\\0 n’a pas été trouvée à l’emplacement attendu."]};
  }
  const machine=peOffset+6<=head.length?u16(head,peOffset+4):0;
  const arch=machine===0x8664?"x64":machine===0x14c?"x86":machine===0xaa64?"arm64":"unknown";
  const characteristics=peOffset+24<=head.length?u16(head,peOffset+22):0;
  const dll=(characteristics&0x2000)!==0;
  reasons.push("Structure Portable Executable (PE) Windows confirmée.");
  if(dll) reasons.push("Le fichier est marqué comme DLL dans son en-tête PE.");
  if(arch!=="unknown") reasons.push("Architecture détectée : "+arch+".");
  return {isExecutable:true,kind:dll?"dll":"pe",validPe:true,architecture:arch,size,reasons};
}

function ascii85Decode(input: Uint8Array): Uint8Array{
  let s=new TextDecoder("latin1").decode(input).replace(/\s+/g,"");
  if(s.endsWith("~>"))s=s.slice(0,-2);
  const out:number[]=[]; let group:number[]=[];
  for(let i=0;i<s.length;i++){
    const c=s.charCodeAt(i);
    if(c===122 && group.length===0){out.push(0,0,0,0);continue;}
    if(c<33||c>117)continue;
    group.push(c-33);
    if(group.length===5){
      let value=0;
      for(const n of group)value=value*85+n;
      out.push((value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255);
      group=[];
    }
  }
  if(group.length){
    const original=group.length;
    while(group.length<5)group.push(84);
    let value=0;
    for(const n of group)value=value*85+n;
    for(let i=0;i<original-1;i++)out.push((value>>>((3-i)*8))&255);
  }
  return new Uint8Array(out);
}

function decodePdfLiteral(raw:string): string{
  const bytes:number[]=[];
  for(let i=0;i<raw.length;i++){
    const c=raw.charCodeAt(i);
    if(c!==92){bytes.push(c&255);continue;}
    const n=raw[++i];
    if(n===undefined)break;
    if(/[0-7]/.test(n)){
      let oct=n;
      for(let j=0;j<2&&i+1<raw.length&&/[0-7]/.test(raw[i+1]);j++)oct+=raw[++i];
      bytes.push(parseInt(oct,8)&255);
    }else{
      const map:any={n:10,r:13,t:9,b:8,f:12,"(":40,")":41,"\\":92};
      bytes.push(map[n]??n.charCodeAt(0));
    }
  }
  try{return new TextDecoder("windows-1252").decode(new Uint8Array(bytes));}
  catch{return new TextDecoder("latin1").decode(new Uint8Array(bytes));}
}

function extractTextOperators(decoded:string): string{
  const parts:string[]=[];
  for(let i=0;i<decoded.length;){
    if(decoded[i]==="("){
      let j=i+1,depth=1;
      while(j<decoded.length&&depth){
        if(decoded[j]==="\\"){j+=2;continue}
        if(decoded[j]==="(")depth++;
        else if(decoded[j]===")")depth--;
        j++;
      }
      if(depth===0){
        let k=j;
        while(k<decoded.length&&/\s/.test(decoded[k]))k++;
        if(decoded.slice(k,k+2)==="Tj"||decoded.slice(k,k+2)==="TJ")parts.push(decodePdfLiteral(decoded.slice(i+1,j-1)));
      }
      i=j;continue;
    }
    i++;
  }
  return parts.join("\n").replace(/[ \t]+/g," ").trim();
}

export async function extractPdfTextFallback(file:File): Promise<string>{
  const bytes=new Uint8Array(await file.arrayBuffer());
  const source=new TextDecoder("latin1").decode(bytes);
  if(!source.startsWith("%PDF-"))throw new Error("Ce fichier n’est pas un PDF valide.");
  const streams:[string,Uint8Array][]=[];
  const re=/<<(?:[^>]|>(?!>))*>>\s*stream\r?\n/g;
  let m:RegExpExecArray|null;
  while((m=re.exec(source))){
    const start=re.lastIndex;
    const end=source.indexOf("endstream",start);
    if(end<0)break;
    const dict=m[0];
    const raw=bytes.slice(start,end).slice(0,source.slice(start,end).search(/[\r\n]*$/));
    try{
      let decoded=raw;
      if(/ASCII85Decode/i.test(dict))decoded=ascii85Decode(decoded);
      if(/FlateDecode/i.test(dict))decoded=pako.inflate(decoded);
      streams.push([dict,decoded]);
    }catch{}
    re.lastIndex=end+"endstream".length;
  }
  const text=streams.map(([,data])=>extractTextOperators(new TextDecoder("latin1").decode(data))).filter(Boolean).join("\n").trim();
  if(!text)throw new Error("PDF lu mais aucun texte extractible n’a été trouvé.");
  return text;
}
