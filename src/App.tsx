import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, Clipboard, Link2, Paperclip, ScanLine, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { analyzeText, type Analysis, type Verdict } from "./lib/analyze";

const verdictMeta:Record<Verdict,{icon:any,label:string,className:string}> = {
  ok:{icon:CheckCircle2,label:"OK",className:"ok"},
  check:{icon:AlertTriangle,label:"À VÉRIFIER",className:"check"},
  caution:{icon:ShieldAlert,label:"PRUDENCE",className:"caution"},
  stop:{icon:ShieldAlert,label:"STOP",className:"stop"}
};

export function App(){
  const [input,setInput]=useState("");
  const [analysis,setAnalysis]=useState<Analysis|null>(null);
  const [history,setHistory]=useState<string[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);

  const canVerify=input.trim().length>0;
  const placeholder=useMemo(()=> "Colle ici un SMS, un e-mail, un lien ou le texte d'une capture…",[]);

  function verify(value=input){
    const clean=value.trim();
    if(!clean) return;
    const result=analyzeText(clean);
    setInput(clean);
    setAnalysis(result);
    setHistory((h)=>[clean.slice(0,80),...h.filter(x=>x!==clean)].slice(0,10));
  }

  function onFile(file?:File){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=> {
      const result=String(reader.result||"");
      setInput(result.startsWith("data:")?"":result);
      if(result && !result.startsWith("data:")) verify(result);
    };
    if(file.type.startsWith("text/")) reader.readAsText(file);
    else {
      setInput("");
      setAnalysis({verdict:"check",title:"Image reçue",summary:"La V1 accepte l'image comme entrée, mais l'OCR réel sera branché dans le moteur V2.",reasons:["Le fichier a bien été reçu."],actions:["Dans la prochaine version, le texte de l'image sera extrait automatiquement."],confidence:"faible"});
    }
  }

  const M=analysis?verdictMeta[analysis.verdict]:null;
  const Icon=M?.icon;

  return <div className="app">
    <header className="topbar"><div className="brand">VÉRIF</div><span className="tagline">Un doute ? Vérifie avant d'agir.</span></header>

    <main>
      {!analysis ? <section className="hero">
        <div className="eyebrow">PROTECTION DU QUOTIDIEN</div>
        <h1>Un doute ?</h1>
        <p>Montre-moi ce que tu as reçu. VÉRIF t'aide à comprendre ce qui mérite ton attention avant d'agir.</p>
        <div className="card composer">
          <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={placeholder} aria-label="Contenu à vérifier"/>
          <div className="tools">
            <button onClick={()=>fileRef.current?.click()} className="tool"><Upload size={18}/> Importer</button>
            <button onClick={()=>navigator.clipboard?.readText().then(t=>setInput(t))} className="tool"><Clipboard size={18}/> Coller</button>
            <button onClick={()=>setInput("https://")} className="tool"><Link2 size={18}/> Lien</button>
            <button onClick={()=>fileRef.current?.click()} className="tool"><ScanLine size={18}/> Photo</button>
            <input ref={fileRef} type="file" accept="image/*,text/plain,.txt" hidden onChange={e=>onFile(e.target.files?.[0])}/>
          </div>
          <button disabled={!canVerify} onClick={()=>verify()} className="primary">VÉRIFIER</button>
        </div>
        <div className="trust"><ShieldCheck size={18}/><span>Analyse explicable • Pas de publicité • Données non envoyées dans ce prototype</span></div>
      </section> :
      <section className="result">
        <button className="back" onClick={()=>setAnalysis(null)}><ChevronLeft size={20}/> Nouvelle vérification</button>
        <div className={`resultCard ${M.className}`}>
          <div className="resultHead"><div className="stateIcon"><Icon size={30}/></div><div><div className="stateLabel">{M.label}</div><h2>{analysis.title}</h2><p>{analysis.summary}</p></div></div>
          <div className="grid2">
            <div className="panel"><h3>Pourquoi ?</h3><ul>{analysis.reasons.map((r,i)=><li key={i}>{r}</li>)}</ul></div>
            <div className="panel"><h3>Que faire ?</h3><ul>{analysis.actions.map((r,i)=><li key={i}>{r}</li>)}</ul></div>
          </div>
          <div className="confidence">Niveau de confiance de l'analyse : <strong>{analysis.confidence}</strong></div>
          {analysis.verdict!=="ok" && <button className="secondary">VÉRIFIER AUTREMENT</button>}
        </div>
        <div className="card inputAgain"><textarea value={input} onChange={e=>setInput(e.target.value)} /><button className="primary" onClick={()=>verify()}>REFAIRE</button></div>
      </section>}
      {history.length>0 && !analysis && <section className="history"><h3>Récentes</h3>{history.map((h,i)=><button key={i} onClick={()=>verify(h)}><Paperclip size={15}/>{h}</button>)}</section>}
    </main>
    <footer>VÉRIF est un outil d'aide à la vérification, pas une garantie absolue de sécurité.</footer>
  </div>
}