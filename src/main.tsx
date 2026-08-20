import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installConsoleErrorCapture } from "./lib/consoleErrorCapture";
import { installSessionRevalidation } from "./lib/sessionGuard";
import "./lib/globalLoading"; // installs window.fetch wrapper for "Carregando" chip

installConsoleErrorCapture();

// v4 force rebuild after auth context updates
installSessionRevalidation();

createRoot(document.getElementById("root")!).render(<App />);
