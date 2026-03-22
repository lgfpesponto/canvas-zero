import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// v3 force rebuild
createRoot(document.getElementById("root")!).render(<App />);
