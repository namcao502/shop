"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase/config";
import { useLocale } from "@/lib/i18n/locale-context";

interface ImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

type UploadSlot = { id: string; status: "uploading" | "error" };

export function ImageUploader({ images, onChange, maxImages = 5 }: ImageUploaderProps) {
  const { t } = useLocale();
  const [slots, setSlots] = useState<UploadSlot[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadingCount = slots.filter((s) => s.status === "uploading").length;
  const remaining = maxImages - images.length - uploadingCount;
  const atMax = remaining <= 0;

  // Always holds the latest images prop — prevents stale closure in async callbacks
  const imagesRef = useRef(images);
  useEffect(() => { imagesRef.current = images; }, [images]);

  const remainingRef = useRef(remaining);
  useEffect(() => { remainingRef.current = remaining; }, [remaining]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const existingNames = new Set(
        imagesRef.current.map((url) => {
          try {
            // Extract original filename from "products/timestamp_i_filename" path
            const path = decodeURIComponent(new URL(url).pathname);
            return path.split("_").slice(2).join("_");
          } catch {
            return url;
          }
        })
      );
      const valid = files
        .filter((f) => f.type.startsWith("image/"))
        .filter((f) => !existingNames.has(f.name))
        .slice(0, Math.max(0, remainingRef.current));
      if (valid.length === 0) return;

      const newSlots: UploadSlot[] = valid.map(() => ({
        id: crypto.randomUUID(),
        status: "uploading",
      }));
      setSlots((prev) => [...prev, ...newSlots]);

      const timestamp = Date.now();
      const results = await Promise.allSettled(
        valid.map(async (file, i) => {
          // index `i` prevents collisions when multiple files share the same name
          const storageRef = ref(storage, `products/${timestamp}_${i}_${file.name}`);
          await uploadBytes(storageRef, file);
          return getDownloadURL(storageRef);
        })
      );

      if (!mountedRef.current) return;

      const successUrls: string[] = [];
      const errorSlots: UploadSlot[] = [];

      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          successUrls.push(result.value);
        } else {
          errorSlots.push({ ...newSlots[i], status: "error" });
        }
      });

      setSlots((prev) => {
        const batchIds = new Set(newSlots.map((s) => s.id));
        return [...prev.filter((s) => !batchIds.has(s.id)), ...errorSlots];
      });

      if (successUrls.length > 0) {
        // Use imagesRef.current so removals made during upload aren't lost
        onChange([...imagesRef.current, ...successUrls]);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      uploadFiles(Array.from(e.dataTransfer.files));
    },
    [uploadFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      uploadFiles(Array.from(e.target.files));
      e.target.value = "";
    },
    [uploadFiles]
  );

  const handleRemove = useCallback(
    async (url: string) => {
      // Only attempt Storage deletion for Firebase Storage URLs;
      // external/placeholder URLs (e.g. placehold.co) are just unlinked.
      if (url.includes("firebasestorage.googleapis.com")) {
        try {
          await deleteObject(ref(storage, url));
        } catch (err: unknown) {
          if ((err as { code?: string })?.code !== "storage/object-not-found") {
            console.error("Failed to delete image from storage:", err);
          }
        }
      }
      onChange(imagesRef.current.filter((u) => u !== url));
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      {(images.length > 0 || slots.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img} className="relative h-16 w-16 overflow-hidden rounded border">
              <img src={img} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(img)}
                className="absolute right-0 top-0 bg-red-600 px-1 text-xs leading-4 text-white transition-colors hover:bg-red-700 active:bg-red-800"
              >
                ✕
              </button>
            </div>
          ))}
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded border bg-gray-100"
            >
              {slot.status === "uploading" ? (
                <svg
                  className="h-6 w-6 animate-spin text-amber-500"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : (
                <span className="text-lg text-red-500" title="Upload failed">
                  ✕
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!atMax && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-sm transition-colors ${
            dragging
              ? "border-amber-500 bg-amber-50 text-amber-700"
              : "border-gray-300 text-gray-500 hover:border-amber-400"
          }`}
        >
          <span>{t("form.dragImagesHint")}</span>
          <span className="mt-1 text-xs">
            {t("form.slotsRemaining").replace("{count}", String(remaining))}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
