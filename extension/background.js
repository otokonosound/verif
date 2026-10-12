importScripts("core.js","research.js");
const VERIF_APP = "https://otokonosound.github.io/verif/";
// The content travels in the URL fragment: it is read by the page but never sent to the web server.
function appUrl(parts) {
  const params = new URLSearchParams();
  if (parts.text) params.set("text", String(parts.text).slice(0, 20000));
  if (parts.url) params.set("url", String(parts.url).slice(0, 2000));
  return VERIF_APP + "#" + params.toString();
}
chrome.runtime.onInstalled.addListener(() => {
  // Menus persist across updates: recreate them from scratch to avoid duplicate-id errors.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({id:"verif-link",title:"VÉRIF — Vérifier ce lien",contexts:["link"]});
    chrome.contextMenus.create({id:"verif-selection",title:"VÉRIF — Vérifier la sélection",contexts:["selection"]});
  });
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "verif-link") {
    chrome.tabs.create({url:appUrl({url:info.linkUrl||""})});
  } else if (info.menuItemId === "verif-selection") {
    chrome.tabs.create({url:appUrl({text:info.selectionText||""})});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "VERIF_RESEARCH") return;
  Promise.resolve(self.VERIF_RESEARCHER?.research(message.payload||{}))
    .then(result => sendResponse({ok:true,result}))
    .catch(error => sendResponse({ok:false,error:String(error?.message||error||"research_failed")}));
  return true;
});
