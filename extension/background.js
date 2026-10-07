importScripts("research.js");
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({id:"verif-link",title:"VÉRIF — Vérifier ce lien",contexts:["link"]});
  chrome.contextMenus.create({id:"verif-selection",title:"VÉRIF — Vérifier la sélection",contexts:["selection"]});
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === "verif-link") {
    chrome.tabs.create({url:"https://otokonosound.github.io/verif/?url="+encodeURIComponent(info.linkUrl||"")});
  } else if (info.menuItemId === "verif-selection") {
    chrome.tabs.create({url:"https://otokonosound.github.io/verif/?text="+encodeURIComponent(info.selectionText||"")});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "VERIF_RESEARCH") return;
  Promise.resolve(self.VERIF_RESEARCHER?.research(message.payload||{}))
    .then(result => sendResponse({ok:true,result}))
    .catch(error => sendResponse({ok:false,error:String(error?.message||error||"research_failed")}));
  return true;
});
