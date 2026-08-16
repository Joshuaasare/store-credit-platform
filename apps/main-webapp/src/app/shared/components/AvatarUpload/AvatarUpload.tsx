import { ChangeEvent, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@store-credit-platform/web-components";
import { Camera, Upload, UserRoundPen, X, Loader2 } from "lucide-react";
import { isMobile } from "react-device-detect";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { toastProperties } from "@shared/utils/misc.utils";
import { defaultImageCompressionOptions } from "@shared/utils/imageCompression.utils";

interface AvatarUploadProps {
  imageURL?: string;
  onChange?: (file: File | null | string) => void;
  initials: string;
  className?: string;
  triggerButtonClassName?: string;
  avatarImageClassName?: string;
  triggerButtonDisabled?: boolean;
  triggerIconClassName?: string;
}

export function AvatarUpload({
  imageURL,
  onChange,
  className,
  triggerButtonClassName,
  avatarImageClassName,
  triggerButtonDisabled,
  triggerIconClassName,
}: AvatarUploadProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file", toastProperties);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB", toastProperties);
      return;
    }
    try {
      setIsCompressing(true);
      const compressedFile = await imageCompression(
        file,
        defaultImageCompressionOptions,
      );
      onChange?.(compressedFile);
    } catch (error) {
      console.error("Error compressing image:", error);
      toast.error("Failed to process image", toastProperties);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleImageRemove = async () => {
    onChange?.(null);
  };

  return (
    <div className="relative">
      <Avatar className={cn("h-20 w-20 md:h-32 md:w-32", className)}>
        <AvatarImage
          className={cn("object-cover", avatarImageClassName)}
          src={imageURL ?? undefined}
        />
        <AvatarFallback>
          {isCompressing ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <UserRoundPen />
          )}
        </AvatarFallback>
      </Avatar>
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          disabled={triggerButtonDisabled || isCompressing}
        >
          <button
            type="button"
            disabled={isCompressing || triggerButtonDisabled}
            className={cn(
              "bg-primary hover:bg-primary/90 absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              triggerButtonClassName,
            )}
            aria-label="Change profile picture"
          >
            {isCompressing ? (
              <Loader2 className="text-primary-foreground h-4 w-4 animate-spin" />
            ) : (
              <Camera
                className={cn(
                  "text-primary-foreground h-4 w-4",
                  triggerIconClassName,
                )}
              />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isMobile && (
            <DropdownMenuItem
              onClick={handleCameraClick}
              disabled={isCompressing}
            >
              <Camera className="mr-1 h-4 w-4" />
              Take Photo
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={handleUploadClick}
            disabled={isCompressing}
          >
            <Upload className="mr-1 h-4 w-4" />
            Upload Image
          </DropdownMenuItem>
          {imageURL && (
            <DropdownMenuItem
              onClick={handleImageRemove}
              disabled={isCompressing}
            >
              <X className="mr-1 h-4 w-4 text-red-500" />
              Remove Image
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        capture="user"
        id="camera"
      />
    </div>
  );
}
