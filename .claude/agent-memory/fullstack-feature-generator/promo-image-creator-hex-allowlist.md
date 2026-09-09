---
name: promo-image-creator-hex-allowlist
description: main-webapp's PromoImageCreator is the one place outside theme files where hex literals are allowed (palettes.ts); templates read colors via PromoPalette props; export is html-to-image 1080x1080.
metadata:
  type: project
---

The merchant webapp's promo image creator (apps/main-webapp/src/app/shared/components/PromoImageCreator/) has its own design-content hex allowlist: `palettes.ts` (5 PromoPalette presets with bg/fg/accent/accentFg slots). Template components must read colors exclusively from the palette prop — never hardcode hexes; UI chrome uses theme tokens. Related: [[customer_app_no_hardcoded_colors]].

**Why:** palettes are merchant-selectable design content (like customer-app theme/colors.ts), and a rebrand only edits palettes.ts + the `brand` entry.

**How to apply:** when adding templates/palettes/fonts, keep all literals in palettes.ts/fonts.ts; export path is renderPromoImage.ts → toBlob 1080×1080 pixelRatio 1 → compressPromoImage → storage.uploadFile with the dialog's uploadFolder. Display fonts (Archivo Black, Bebas Neue) are single-weight 400 self-hosted woff2 in public/assets/fonts/ — don't request other weights from them.