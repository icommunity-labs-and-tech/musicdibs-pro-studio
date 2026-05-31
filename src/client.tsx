import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { StartClient } from "@tanstack/react-start/client";

import { getRouter } from "./router";

type StartHydrationState = {
  router?: unknown;
};

declare global {
  interface Window {
    $_TSR?: StartHydrationState;
  }
}

function hasServerHydrationPayload() {
  return Boolean(window.$_TSR?.router);
}

function getSpaMountNode() {
  let node = document.getElementById("root");

  if (!node) {
    node = document.createElement("div");
    node.id = "root";
    document.body.appendChild(node);
  }

  return node;
}

startTransition(() => {
  if (hasServerHydrationPayload()) {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
    return;
  }

  const router = getRouter();

  createRoot(getSpaMountNode()).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});