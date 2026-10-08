import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // Activating an offline cache must not discard a message or file being analyzed.
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=7`, { updateViaCache: "none" }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
