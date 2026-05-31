import { StrictMode, startTransition } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { StartClient } from "@tanstack/react-start/client";

import { getRouter } from "./router";

type WindowWithStartHydration = Window & { $_TSR?: { router?: unknown } };

function hasServerHydrationPayload() {
  return Boolean((window as WindowWithStartHydration).$_TSR?.router);
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

function disableDocumentShellForSpa(router: ReturnType<typeof getRouter>) {
  const rootRoute = router.routesById.__root__ as {
    options: { shellComponent?: unknown };
  };
  rootRoute.options.shellComponent = undefined;
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
  disableDocumentShellForSpa(router);

  createRoot(getSpaMountNode()).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});