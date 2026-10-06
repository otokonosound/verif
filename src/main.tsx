import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (!sessionStorage.getItem("verif-sw-reloaded-v6")) { sessionStorage.setItem("verif-sw-reloaded-v6", "1"); window.location.reload(); } });
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js?v=6`, { updateViaCache: "none" }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
