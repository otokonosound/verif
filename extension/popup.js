const $=id=>document.getElementById(id);
async function scan(){
  $("status").hidden=false;$("result").hidden=true;
  const tabs=await chrome.tabs.query({active:true,currentWindow:true});
  const tab=tabs[0];
  let data={url:tab?.url||"",title:tab?.title||"",text:""};
  if(tab?.id){
    try{
      const mail=await chrome.tabs.sendMessage(tab.id,{type:"VERIF_GET_EMAIL"});
      if(mail?.text) data=mail;
      else data=await chrome.tabs.sendMessage(tab.id,{type:"VERIF_SCAN_PAGE"});
    }catch{
      try{data=await chrome.tabs.sendMessage(tab.id,{type:"VERIF_SCAN_PAGE"});}catch{}
    }
  }
  let a=VERIF_ANALYZER.analyzePage(data);
  let researchResult=null;
  try{
    if(data.url&&/^https?:/i.test(data.url)){
      const reply=await chrome.runtime.sendMessage({type:"VERIF_RESEARCH",payload:{urls:[data.url],text:data.text||"",claimedBrand:a.brand||null,officialDomain:a.official?a.root:null}});
      researchResult=reply?.ok?reply.result:null;
      const item=researchResult?.items?.[0]||null;
      if(item){
        const webFindings=item.findings||[];
        let bump=0;
        if(item.rdap?.ageDays!=null&&item.rdap.ageDays<30)bump+=3;
        else if(item.rdap?.ageDays!=null&&item.rdap.ageDays<90)bump+=1;
        if(item.finalHost&&item.host&&item.finalHost!==item.host)bump+=1;
        if(webFindings.some(x=>/destination finale ne correspond/i.test(x)))bump+=3;
        if(!a.official&&webFindings.some(x=>/informations sensibles/i.test(x)))bump+=2;
        const rank={ok:0,check:1,caution:2,stop:3};
        let r=rank[a.verdict]||0;
        if(bump>=5)r=Math.max(r,3);else if(bump>=2)r=Math.max(r,2);else if(bump>=1)r=Math.max(r,1);
        const verdict=["ok","check","caution","stop"][r];
        if(verdict!==a.verdict){
          a={...a,verdict,title:verdict==="stop"?"N’agis pas tout de suite":verdict==="caution"?"Prudence":verdict==="check"?"À vérifier":a.title,summary:verdict==="stop"?"La recherche web a confirmé des signaux de risque supplémentaires.":verdict==="caution"?"La recherche web a relevé des éléments qui nécessitent de la prudence.":a.summary};
        }
        a.reasons=[...(a.reasons||[]),...webFindings.map(x=>"Recherche web : "+x)].slice(0,12);
      }
    }
  }catch{}
  try{
    const ai=await globalThis.VERIF_LOCAL_AI?.review(data,a,researchResult);
    if(ai?.used&&ai.verdict){
      const rank={ok:0,check:1,caution:2,stop:3};
      const current=rank[a.verdict]||0, proposed=rank[ai.verdict]||0;
      if(proposed>current){
        a={...a,verdict:ai.verdict,title:ai.verdict==="stop"?"N’agis pas tout de suite":ai.verdict==="caution"?"Prudence":ai.verdict==="check"?"À vérifier":a.title,summary:ai.summary||a.summary};
      }
      a.reasons=[...(a.reasons||[]),...(ai.reasons||[]).map(x=>"IA locale : "+x)].slice(0,12);
    }
  }catch{}
  $("status").hidden=true;$("result").hidden=false;
  $("badge").innerHTML='<span class="badge '+a.verdict+'">'+({ok:"OK",check:"À VÉRIFIER",caution:"PRUDENCE",stop:"STOP"}[a.verdict])+"</span>";
  $("title").textContent=a.title;$("summary").textContent=a.summary;
  $("host").textContent=a.host?("Site : "+a.host):"Page spéciale ou adresse non analysable";
  $("reasons").innerHTML=(a.reasons.length?a.reasons:["Aucun signal notable."]).map(x=>"<li>"+escapeHtml(x)+"</li>").join("");
  $("open").onclick=()=>chrome.tabs.create({url:"https://otokonosound.github.io/verif/?url="+encodeURIComponent(data.url||"")+"&text="+encodeURIComponent(data.text||data.title||"")});
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
$("again").onclick=scan;scan();
