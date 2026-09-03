import { createElement, type ComponentType } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { toBlob } from "html-to-image";
import { PROMO_IMAGE_SIZE, type PromoTemplateProps } from "./types";

// Match the @font-face families in styles.css so html-to-image embeds the real
// faces (not a fallback) into the exported PNG.
const FONT_LOAD_SPECS = [
  '400 100px "Inter"',
  '400 100px "Archivo Black"',
  '400 100px "Bebas Neue"',
];

async function ensureFontsLoaded(): Promise<void> {
  await Promise.all(
    FONT_LOAD_SPECS.map((spec) => document.fonts.load(spec).catch(() => [])),
  );
}

export async function renderPromoImage(
  Template: ComponentType<PromoTemplateProps>,
  props: PromoTemplateProps,
): Promise<Blob> {
  await ensureFontsLoaded();
  const container = document.createElement("div");
  container.setAttribute(
    "style",
    `position: fixed; left: -99999px; top: 0; width: ${PROMO_IMAGE_SIZE}px; height: ${PROMO_IMAGE_SIZE}px;`,
  );
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    flushSync(() => {
      root.render(createElement(Template, props));
    });
    const node = container.firstElementChild;
    if (!(node instanceof HTMLElement)) {
      throw new Error("Failed to render promo template");
    }
    const blob = await toBlob(node, {
      width: PROMO_IMAGE_SIZE,
      height: PROMO_IMAGE_SIZE,
      pixelRatio: 1,
      cacheBust: true,
    });
    if (!blob) throw new Error("Failed to export promo image");
    return blob;
  } finally {
    root.unmount();
    container.remove();
  }
}
