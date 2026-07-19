import { useRef, useState, type ChangeEvent } from "react";
import { Camera, Pencil, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Badge,
  cn,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@store-credit-platform/web-components";
import {
  MerchantWithStats,
  UpdateMerchantRequest,
} from "@shared/types/api.types";
import { createStorageService } from "@store-credit-platform/api-services";
import { getCountryByCode } from "@shared/utils/countries";
import { compressImage } from "@shared/utils/imageCompression.utils";
import { useStoreStore } from "@shared/stores/storeStore";
import { MerchantEditDialog } from "./MerchantEditDialog";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { slugify } from "@shared/utils/string.utils";

const STORE_ASSETS_BUCKET = "store-assets";
const storage = createStorageService();

type ImageField = "logo_url" | "cover_photo_url";

function useStoreImageUpload(
  merchantId: number,
  merchantFolder: string,
  field: ImageField,
  folder: string,
) {
  const updateMerchant = useStoreStore((s) => s.updateMerchant);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isWorking, setIsWorking] = useState(false);

  const openFilePicker = () => inputRef.current?.click();

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    try {
      setIsWorking(true);
      const compressed = await compressImage(file);
      const { publicUrl } = await storage.uploadFile(compressed, {
        bucket: STORE_ASSETS_BUCKET,
        folder: `${merchantFolder}/${folder}`,
        id: merchantId,
        contentType: compressed.type || "image/jpeg",
      });
      await updateMerchant({ [field]: publicUrl } as UpdateMerchantRequest);
      toast.success(
        field === "logo_url" ? "Logo updated" : "Cover updated",
        successToastProperties,
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed",
        errorToastProperties,
      );
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (currentUrl: string | null) => {
    if (!currentUrl) return;
    try {
      setIsWorking(true);
      await storage.deleteFiles({
        bucket: STORE_ASSETS_BUCKET,
        url: currentUrl,
      });
      await updateMerchant({ [field]: null } as UpdateMerchantRequest);
      toast.success(field === "logo_url" ? "Logo removed" : "Cover removed");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove image",
      );
    } finally {
      setIsWorking(false);
    }
  };

  return { inputRef, isWorking, openFilePicker, onFileChange, remove };
}

interface StoreHeroProps {
  merchant: MerchantWithStats;
  isManager: boolean;
}

export function StoreHero({ merchant, isManager }: StoreHeroProps) {
  const country = getCountryByCode(merchant.country_code as any);
  const initials = merchant.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const year = new Date(merchant.created_at).getFullYear();
  const hasCover = !!merchant.cover_photo_url;
  const hasLogo = !!merchant.logo_url;

  const merchantFolder = `merchant-${slugify(merchant.name, "store")}`;
  const logo = useStoreImageUpload(
    merchant.id,
    merchantFolder,
    "logo_url",
    "logo",
  );
  const cover = useStoreImageUpload(
    merchant.id,
    merchantFolder,
    "cover_photo_url",
    "cover",
  );

  return (
    <div className="group/hero animate-fade-in-up relative flex flex-col gap-5 overflow-hidden rounded-2xl border shadow-sm motion-reduce:animate-none md:flex-row md:items-center md:justify-between">
      {/* Background layer */}
      {hasCover ? (
        <>
          <img
            src={merchant.cover_photo_url as string}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70" />
        </>
      ) : (
        <>
          <div className="from-primary/10 via-card to-card absolute inset-0 bg-gradient-to-br" />
          <div
            aria-hidden
            className="bg-primary/15 pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
          />
        </>
      )}

      {/* Cover upload-in-progress overlay */}
      {isManager && cover.isWorking && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}

      {/* Top-right cluster: cover edit (hover-only) + Edit profile (always) */}
      {isManager && (
        <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={cover.isWorking}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-black/40 text-white backdrop-blur transition-all",
                  "opacity-0 focus-visible:opacity-100 group-hover/hero:opacity-100",
                  "hover:bg-black/60 disabled:opacity-50",
                )}
                aria-label="Change cover image"
                title="Change cover image"
              >
                {cover.isWorking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={cover.openFilePicker}
                disabled={cover.isWorking}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload photo
              </DropdownMenuItem>
              {hasCover && (
                <DropdownMenuItem
                  onClick={() => cover.remove(merchant.cover_photo_url)}
                  disabled={cover.isWorking}
                >
                  <X className="mr-2 h-4 w-4 text-red-500" />
                  Remove photo
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <MerchantEditDialog merchant={merchant}>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 backdrop-blur",
                hasCover
                  ? "border-white/30 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  : "bg-background/60",
              )}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit profile
            </Button>
          </MerchantEditDialog>
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10 flex items-center gap-5 p-8 md:p-10">
        {/* Logo tile — hover to edit */}
        <div className="group/logo relative h-20 w-20 shrink-0 md:h-24 md:w-24">
          <div
            className={cn(
              "z-50 flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg text-2xl font-semibold ring-1 md:h-24 md:w-24",
              "from-secondary/40 to-secondary/30 text-primary ring-primary/20 bg-gradient-to-br",
            )}
          >
            {hasLogo ? (
              <img
                src={merchant.logo_url as string}
                alt={merchant.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initials || "S"}</span>
            )}
          </div>

          {isManager && (
            <>
              {/* Upload-in-progress overlay (shown regardless of hover) */}
              {logo.isWorking && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-black/60">
                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity duration-200 group-hover/logo:pointer-events-auto group-hover/logo:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={logo.isWorking}
                      className="text-white transition-transform hover:scale-105 disabled:opacity-50"
                      aria-label="Change logo"
                      title="Change logo"
                    >
                      {logo.isWorking ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={logo.openFilePicker}
                      disabled={logo.isWorking}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload photo
                    </DropdownMenuItem>
                    {hasLogo && (
                      <DropdownMenuItem
                        onClick={() => logo.remove(merchant.logo_url)}
                        disabled={logo.isWorking}
                      >
                        <X className="mr-2 h-4 w-4 text-red-500" />
                        Remove photo
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <input
                ref={logo.inputRef}
                type="file"
                accept="image/*"
                onChange={logo.onFileChange}
                className="hidden"
              />
            </>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className={cn(
                "truncate text-3xl font-semibold tracking-tight md:text-4xl",
                hasCover ? "text-white" : "text-foreground",
              )}
            >
              {merchant.name}
            </h1>
            {country && (
              <span
                title={country.name}
                className="text-3xl leading-none"
                aria-label={country.name}
              >
                {country.flag}
              </span>
            )}
          </div>
          <div
            className={cn(
              "mt-2 flex flex-wrap items-center gap-2 text-sm",
              hasCover ? "text-white/80" : "text-muted-foreground",
            )}
          >
            <Badge
              variant={merchant.is_active ? "default" : "secondary"}
              className={cn(
                "gap-1.5",
                hasCover &&
                  "border-white/30 bg-white/10 text-white hover:bg-white/15",
              )}
            >
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  merchant.is_active ? "bg-emerald-400" : "bg-white/50",
                )}
              />
              {merchant.is_active ? "Active" : "Inactive"}
            </Badge>
            <span
              className={
                hasCover ? "text-white/50" : "text-muted-foreground/70"
              }
            >
              ·
            </span>
            <span>Since {year}</span>
            {merchant.slug && (
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-xs",
                  hasCover
                    ? "border-white/20 bg-white/10 text-white/80"
                    : "bg-muted/50 text-muted-foreground",
                )}
              >
                /{merchant.slug}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hidden cover file input (logo input is inside the logo tile above) */}
      {isManager && (
        <input
          ref={cover.inputRef}
          type="file"
          accept="image/*"
          onChange={cover.onFileChange}
          className="hidden"
        />
      )}
    </div>
  );
}
