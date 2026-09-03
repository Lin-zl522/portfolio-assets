import React from "react";
import { createRoot } from "react-dom/client";
import PortfolioWebsitePrototype from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PortfolioWebsitePrototype />
  </React.StrictMode>,
);

