import React from "react";
import ReactDOM from "react-dom/client";
import { ColorModeProvider } from "./theme/ColorMode";
import { ToastProvider } from "@/shared/toast/ToastProvider";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ColorModeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ColorModeProvider>
  </React.StrictMode>,
);
