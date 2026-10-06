(() => {
  const host = location.hostname.toLowerCase();
  const isGmail = host === "mail.google.com";
  const isOutlook = host === "outlook.live.com" || host === "outlook.office.com" || host.endsWith(".outlook.office.com");

  function visibleText(root = document.body) {
    return (root?.innerText || "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 30000);
  }

  function extractMail() {
    const selectors = isGmail
      ? ["div[role="main"]", "div[role="article"]", "div.a3s"]
      : ["div[role="main"]", "div[aria-label*="Message body"]", "div[contenteditable="true"]"];
    let root = null;
    for (const selector of selectors) {
      const candidate = document.querySelector(selector);
      if (candidate && visibleText(candidate).length > 80) { root = candidate; break; }
    }
    const text = visibleText(root || document.body);
    return {
      url: location.href,
      title: document.title || "",
      text: text || visibleText(document.body),
      provider: isGmail ? "Gmail" : "Outlook"
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "VERIF_SCAN_PAGE") {
      const selected = window.getSelection?.()?.toString() || "";
      const body = visibleText(document.body);
      sendResponse({
        url: location.href,
        title: document.title || "",
        text: (selected ? selected + "\n" : "") + body.slice(0, 20000)
      });
      return true;
    }
    if (message?.type === "VERIF_GET_EMAIL" && (isGmail || isOutlook)) {
      sendResponse(extractMail());
      return true;
    }
  });

  if (!(isGmail || isOutlook)) return;

  function injectButton() {
    if (document.getElementById("verif-mail-button")) return;
    const button = document.createElement("button");
    button.id = "verif-mail-button";
    button.type = "button";
    button.textContent = "✓ VÉRIF";
    Object.assign(button.style, {
      position: "fixed", right: "18px", bottom: "18px", zIndex: "2147483647",
      border: "0", borderRadius: "999px", padding: "10px 14px",
      background: "#173d34", color: "#fff", font: "600 13px system-ui,sans-serif",
      boxShadow: "0 4px 18px rgba(0,0,0,.22)", cursor: "pointer"
    });
    button.addEventListener("click", () => {
      const data = extractMail();
      const target = "https://otokonosound.github.io/verif/?text=" +
        encodeURIComponent(data.text) + "&url=" + encodeURIComponent(data.url);
      window.open(target, "_blank", "noopener,noreferrer");
    });
    document.documentElement.appendChild(button);
  }

  const observer = new MutationObserver(() => injectButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  injectButton();
})();
