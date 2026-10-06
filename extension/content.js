chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "VERIF_SCAN_PAGE") return;
  const selected = window.getSelection?.()?.toString() || "";
  const body = document.body?.innerText || "";
  sendResponse({
    url: location.href,
    title: document.title || "",
    text: (selected ? selected + "\n" : "") + body.slice(0, 20000)
  });
  return true;
});