import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, cn } from "@store-credit-platform/web-components";
import { createStorageService } from "@store-credit-platform/api-services";
import { compressPromoImage } from "@shared/utils/imageCompression.utils";
import { getErrorMessage } from "@shared/utils/errors.utils";
import { errorToastProperties } from "@shared/utils/misc.utils";
import {
  PROMO_FIELD_SETS,
  getPromoTemplates,
  getPromoTemplate,
} from "./registry";
import { PROMO_PALETTES, getPromoPalette } from "./palettes";
import { PROMO_FONTS, getPromoFont } from "./fonts";
import { renderPromoImage } from "./renderPromoImage";
import {
  PROMO_IMAGE_SIZE,
  type PromoConfigType,
  type PromoDesignConfig,
} from "./types";

const storage = createStorageService();
const STORE_ASSETS_BUCKET = "store-assets";

interface PromoImageCreatorProps {
  configType: PromoConfigType;
  uploadFolder: string;
  initialText?: {
    value?: string;
    headline?: string;
  };
  onBack: () => void;
  onSaved: (publicUrl: string) => void;
}

function PromoThumb({
  width,
  children,
}: {
  width: number;
  children: ReactNode;
}) {
  const scale = width / PROMO_IMAGE_SIZE;
  return (
    <div
      style={{ width, height: width, overflow: "hidden" }}
      className="bg-muted/30"
    >
      <div
        style={{
          width: PROMO_IMAGE_SIZE,
          height: PROMO_IMAGE_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function PromoImageCreator({
  configType,
  uploadFolder,
  initialText,
  onBack,
  onSaved,
}: PromoImageCreatorProps) {
  const templates = getPromoTemplates(configType);
  const textFields = PROMO_FIELD_SETS[configType];
  const [config, setConfig] = useState<PromoDesignConfig>({
    templateId: templates[0].id,
    value: initialText?.value ?? "",
    headline: initialText?.headline ?? "",
    paletteId: PROMO_PALETTES[0].id,
    fontId: "archivo-black",
  });
  const [exporting, setExporting] = useState(false);

  const update = (patch: Partial<PromoDesignConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));

  const previewRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState(380);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setPreviewWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateStripArrows = () => {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateStripArrows();
    const el = stripRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateStripArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [templates.length]);

  const scrollStrip = (direction: 1 | -1) => {
    stripRef.current?.scrollBy({ left: direction * 220, behavior: "smooth" });
  };

  const palette = getPromoPalette(config.paletteId);
  const font = getPromoFont(config.fontId);
  const SelectedTemplate = getPromoTemplate(
    config.templateId,
    configType,
  ).Component;
  const templateProps = {
    value: config.value,
    headline: config.headline,
    palette,
    font,
  };

  const handleSave = async () => {
    const value = config.value.trim();
    if (!value || exporting) return;
    setExporting(true);
    try {
      const template = getPromoTemplate(config.templateId, configType);
      const blob = await renderPromoImage(template.Component, {
        value,
        headline: config.headline.trim(),
        palette,
        font,
      });
      const file = new File([blob], `promo-${template.id}-${Date.now()}.png`, {
        type: "image/png",
      });
      const compressed = await compressPromoImage(file);
      const { publicUrl } = await storage.uploadFile(compressed, {
        bucket: STORE_ASSETS_BUCKET,
        folder: uploadFolder,
        id: crypto.randomUUID(),
        contentType: compressed.type || "image/png",
      });
      onSaved(publicUrl);
    } catch (err) {
      toast.error(
        getErrorMessage(err, "Failed to create promo image"),
        errorToastProperties,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Template</span>
        <div className="flex min-w-0 items-center gap-2">
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Scroll templates left"
              onClick={() => scrollStrip(-1)}
              className="border-border text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full border p-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div
            ref={stripRef}
            onScroll={updateStripArrows}
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto scroll-smooth pb-1"
          >
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => update({ templateId: t.id })}
                className={cn(
                  "shrink-0 cursor-pointer rounded-md border p-1 transition-colors",
                  config.templateId === t.id
                    ? "border-primary ring-primary/30 ring-2"
                    : "border-border hover:border-primary/50",
                )}
              >
                <PromoThumb width={88}>
                  <t.Component {...templateProps} />
                </PromoThumb>
                <span className="text-foreground block pt-0.5 text-center text-[11px]">
                  {t.label}
                </span>
              </button>
            ))}
          </div>
          {canScrollRight && (
            <button
              type="button"
              aria-label="Scroll templates right"
              onClick={() => scrollStrip(1)}
              className="border-border text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full border p-1.5"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {textFields.map((f) => (
          <div key={f.id} className="space-y-1.5">
            <label htmlFor={`promo-${f.id}`} className="text-sm font-medium">
              {f.label}
              {f.required ? " *" : ""}
            </label>
            <Input
              id={`promo-${f.id}`}
              value={config[f.id]}
              maxLength={f.maxLength}
              placeholder={f.placeholder}
              onChange={(e) => {
                const next = { ...config };
                next[f.id] = e.target.value;
                setConfig(next);
              }}
            />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Palette</span>
        <div className="flex gap-2">
          {PROMO_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.label}
              aria-label={`${p.label} palette`}
              onClick={() => update({ paletteId: p.id })}
              style={{
                background: `linear-gradient(135deg, ${p.bg} 50%, ${p.accent} 50%)`,
              }}
              className={cn(
                "border-border h-9 w-9 cursor-pointer rounded-full border",
                config.paletteId === p.id &&
                  "ring-primary ring-offset-background ring-2 ring-offset-2",
              )}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Font</span>
        <div className="flex gap-2">
          {PROMO_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => update({ fontId: f.id })}
              style={{ fontFamily: f.fontFamily }}
              className={cn(
                "border-border text-foreground flex-1 cursor-pointer rounded-md border px-3 py-1.5 text-base",
                config.fontId === f.id
                  ? "border-primary ring-primary/30 ring-2"
                  : "hover:border-primary/50",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="text-sm font-medium">Preview</span>
        <div
          ref={previewRef}
          className="border-border mx-auto aspect-square w-full max-w-[380px] overflow-hidden rounded-lg border"
        >
          <PromoThumb width={previewWidth}>
            <SelectedTemplate {...templateProps} />
          </PromoThumb>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={exporting}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={exporting || !config.value.trim()}
        >
          {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
          {exporting ? "Saving…" : "Save image"}
        </Button>
      </div>
    </div>
  );
}
