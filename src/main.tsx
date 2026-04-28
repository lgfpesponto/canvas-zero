import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installConsoleErrorCapture } from "./lib/consoleErrorCapture";

installConsoleErrorCapture();

// v3 force rebuild
createRoot(document.getElementById("root")!).render(<App />);
