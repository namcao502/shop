# Image Uploader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual URL-paste input in the admin product form with a drag-and-drop image uploader that uploads files to Firebase Storage and deletes them on removal.

**Architecture:** A new controlled `ImageUploader` component handles all drag-and-drop, upload, and delete logic. `ProductForm` owns the `images: string[]` state and passes it in with an `onChange` callback — `ImageUploader` never holds authoritative state. Uploads use `Promise.allSettled` so a batch of dropped files is resolved together, avoiding stale-closure issues from concurrent parallel `onChange` calls.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firebase Storage (`uploadBytes`, `getDownloadURL`, `deleteObject`), Tailwind CSS, native HTML5 drag events (no library).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/admin/ImageUploader.tsx` | **Create** | All drag-drop, upload, delete, and upload-slot UI |
| `src/components/admin/ProductForm.tsx` | **Modify** | Remove URL-paste state/JSX, add `<ImageUploader>` |

---

## Task 1: Create `ImageUploader` component

**Files:**
- Create: `src/components/admin/ImageUploader.tsx`

- [ ] **Step 1: Create the file with full implementation**

Create `src/components/admin/ImageUploader.tsx` with this exact content:

```tsx
"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase/config";

interface ImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

type UploadSlot = { id: string; status: "uploading" | "error" };

export function ImageUploader({ images, onChange, maxImages = 5 }: ImageUploaderProps) {
  const [slots, setSlots] = useState<UploadSlot[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Always holds the latest images prop — prevents stale closure in async callbacks
  const imagesRef = useRef(images);
  useEffect(() => { imagesRef.current = images; }, [images]);

  const uploadingCount = slots.filter((s) => s.status === "uploading").length;
  const remaining = maxImages - images.length - uploadingCount;
  const atMax = remaining <= 0;

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const valid = files
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, Math.max(0, remaining));
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
    [onChange, remaining]
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
      try {
        await deleteObject(ref(storage, url));
      } catch {
        // file already gone — still remove from list
      }
      // Use imagesRef.current for the same reason as uploadFiles
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
                className="absolute right-0 top-0 bg-red-600 px-1 text-xs leading-4 text-white"
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
          <span>Drag images here or click to browse</span>
          <span className="mt-1 text-xs">
            {remaining} slot{remaining !== 1 ? "s" : ""} remaining
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
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: build completes with no TypeScript errors. If errors appear, fix them before continuing.

---

## Task 2: Wire `ImageUploader` into `ProductForm`

**Files:**
- Modify: `src/components/admin/ProductForm.tsx`

- [ ] **Step 1: Replace the images section in `ProductForm`**

In `src/components/admin/ProductForm.tsx`, make these three changes:

**Change 1** — add the import after the existing imports (line 7):

```tsx
import { ImageUploader } from "@/components/admin/ImageUploader";
```

**Change 2** — remove `newImageUrl` state, `addImage`, and `removeImage` (all replaced by `ImageUploader`). Delete these lines (currently lines 30, 46–55):

```tsx
// DELETE this line:
const [newImageUrl, setNewImageUrl] = useState("");

// DELETE this function:
const addImage = () => {
  if (newImageUrl.trim()) {
    setImages([...images, newImageUrl.trim()]);
    setNewImageUrl("");
  }
};

// DELETE this function:
const removeImage = (index: number) => {
  setImages(images.filter((_, i) => i !== index));
};
```

**Change 3** — replace the entire images `<div>` block (currently lines 125–153) with:

```tsx
<div>
  <label className="text-sm font-medium text-gray-700">
    {t("form.images")}
  </label>
  <div className="mt-2">
    <ImageUploader images={images} onChange={setImages} maxImages={5} />
  </div>
</div>
```

- [ ] **Step 2: Type-check**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Smoke-test manually**

1. Start dev server: `npm run dev`
2. Navigate to `http://localhost:3000/admin/products`
3. Click "Add product" (or edit an existing product)
4. Verify the URL-paste input is gone
5. Drop an image file onto the drop zone — confirm it uploads, a thumbnail appears, and the slot count decrements
6. Drop more than the remaining slots — confirm excess files are ignored
7. Click ✕ on a thumbnail — confirm it disappears and the slot count increments
8. Verify the saved product has the Firebase Storage URL in its `images` array (check Firestore in Firebase console)

---

## Self-Review

**Spec coverage:**
- ✅ Drag-and-drop zone — implemented with `onDragOver`/`onDrop`
- ✅ Click to browse — `inputRef.current?.click()` on zone click
- ✅ Max 5 images — `remaining` clamps valid files; drop zone hides at max
- ✅ Upload to Firebase Storage — `uploadBytes` + `getDownloadURL`
- ✅ Delete from Storage on remove — `deleteObject` with graceful failure
- ✅ Multiple files at once — `Promise.allSettled` over valid file array
- ✅ Uploading spinner placeholder — `UploadSlot` with `status: "uploading"`
- ✅ Upload error state — `UploadSlot` with `status: "error"`
- ✅ Amber drag-over highlight — `dragging` state toggles Tailwind classes
- ✅ URL-paste input removed from `ProductForm`
- ✅ `ImageUploader` is fully controlled — no internal state for confirmed URLs

**Notes:**
- `onChange` is called once per *batch* (not per individual upload) using `Promise.allSettled`. This avoids a race condition where concurrent upload completions would all read the same stale `images` prop and overwrite each other.
- `imagesRef` keeps a live pointer to the latest `images` prop so async callbacks (`uploadFiles`, `handleRemove`) never act on stale data — e.g. a removal made mid-upload is not undone when the upload batch completes.
- Storage path includes both timestamp and index (`${timestamp}_${i}_${file.name}`) to prevent collisions when multiple files from the same batch share identical names.
