const $=id=>document.getElementById(id);
let generation=0;
async function scan(){
  const current=++generation;
  $('status').hidden=false;
  let data={url:'',title:'',text:''};
  try{
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    data={url:tab?.url||'',title:tab?.title||'',text:''};
    if(tab?.id){try{const mail=await chrome.tabs.sendMessage(tab.id,{type:'VERIF_GET_EMAIL'});data=mail?.text?mail:await chrome.tabs.sendMessage(tab.id,{type:'VERIF_SCAN_PAGE'});}catch{}}
    // For a webmail, the tab URL is the mailbox itself, not evidence about the message.
    const pageUrl=data.provider?'':(data.url||'');
    const input=[data.text||data.title||'',pageUrl].join('\n');
    const base=VERIF_CORE.analyzeBase(input);
    const aiPromise=globalThis.VERIF_LOCAL_AI?.review(data,base,null);
    let research=null;
    if($('web').checked&&base.urls?.length){
      try{const reply=await chrome.runtime.sendMessage({type:'VERIF_RESEARCH',payload:{urls:base.urls.map(u=>u.url)}});research=reply?.ok?reply.result:null;}catch{}
    }
    const ai=await aiPromise||{available:false,used:false};
    if(current!==generation)return;
    const a=VERIF_CORE.enrichLocal(base,input,ai,research);
    $('result').hidden=false;
    $('badge').innerHTML='<span class="badge '+a.verdict+'">'+({ok:'OK',check:'À VÉRIFIER',caution:'PRUDENCE',stop:'STOP'}[a.verdict])+'</span>';
    $('title').textContent=a.title;
    $('summary').textContent=a.summary;
    $('host').textContent=`IA locale : ${ai.used?'utilisée':'indisponible'} · Recherche : ${a.intelligence.web.available?'DNS/RDAP':'locale uniquement'}`;
    $('reasons').innerHTML=a.reasons.map(x=>'<li>'+escapeHtml(x)+'</li>').join('');
    $('open').onclick=()=>{const params=new URLSearchParams();params.set('text',String(data.text||data.title||'').slice(0,20000));if(pageUrl)params.set('url',pageUrl.slice(0,2000));chrome.tabs.create({url:'https://otokonosound.github.io/verif/#'+params.toString()});};
  }catch{
    if(current!==generation)return;
    $('result').hidden=false;$('title').textContent='Analyse indisponible';$('summary').textContent='Ouvre VÉRIF pour coller le contenu à vérifier.';
  }finally{if(current===generation)$('status').hidden=true;}
}
function escapeHtml(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
$('web').onchange=scan;$('again').onclick=scan;scan();
