import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event?.reason?.message || event?.reason || "");
  if (
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError") ||
    msg.includes("dynamically imported") ||
    msg.includes("Failed to fetch dynamically imported module")
  ) {
    window.location.reload();
  }
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
