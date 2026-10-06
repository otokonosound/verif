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
  const a=VERIF_ANALYZER.analyzePage(data);
  $("status").hidden=true;$("result").hidden=false;
  $("badge").innerHTML='<span class="badge '+a.verdict+'">'+({ok:"OK",check:"À VÉRIFIER",caution:"PRUDENCE",stop:"STOP"}[a.verdict])+"</span>";
  $("title").textContent=a.title;$("summary").textContent=a.summary;
  $("host").textContent=a.host?("Site : "+a.host):"Page spéciale ou adresse non analysable";
  $("reasons").innerHTML=(a.reasons.length?a.reasons:["Aucun signal notable."]).map(x=>"<li>"+escapeHtml(x)+"</li>").join("");
  $("open").onclick=()=>chrome.tabs.create({url:"https://otokonosound.github.io/verif/?url="+encodeURIComponent(data.url||"")+"&text="+encodeURIComponent(data.text||data.title||"")});
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;"}[c]));}
$("again").onclick=scan;scan();
