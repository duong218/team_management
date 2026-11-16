import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AppErrorBoundary from "./components/common/AppErrorBoundary.jsx";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource-variable/bricolage-grotesque/wght.css";
import "./index.css";
import "./styles/clay.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
