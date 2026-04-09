# Image Uploader — Design Spec

**Date:** 2026-04-09  
**Feature:** Drag-and-drop image upload for admin product form

---

## Overview

Replace the manual URL-paste input in `ProductForm` with a drag-and-drop image uploader. Files are uploaded directly to Firebase Storage from the client; their download URLs are stored in the product's `images` array. Removing an image from the form also deletes the file from Storage.

---

## Component

**File:** `src/components/admin/ImageUploader.tsx`

### Props

```ts
interface ImageUploaderProps {
  images: string[];                     // current Firebase Storage download URLs
  onChange: (urls: string[]) => void;   // called with new array after every change
  maxImages?: number;                   // default 5
}
```

`ProductForm` owns `images` state. `ImageUploader` is a fully controlled component — it never holds authoritative state, only calls `onChange`.

---

## Upload Flow

1. Admin drops files onto the zone or clicks to browse (`<input type="file" multiple accept="image/*">`).
2. Validate: only image MIME types; silently ignore excess files beyond the remaining slots (`maxImages - images.length`).
3. For each valid file, create a Storage reference at `products/{Date.now()}_{filename}`.
4. Upload all files in parallel via `uploadBytesResumable` (or `uploadBytes`).
5. On success, call `getDownloadURL` and append the URL to `images` via `onChange`.
6. `onChange` is called once per successful upload (not batched), so thumbnails appear as each finishes.

---

## Delete Flow

1. Admin clicks ✕ on a thumbnail.
2. Extract the storage object path from the URL using `ref(storage, url)`.
3. Call `deleteObject` on that ref.
4. Remove the URL from `images` via `onChange`.
5. If `deleteObject` fails (e.g. file already gone), still remove from `images` — don't block the admin.

---

## Upload Error Handling

- If an individual upload fails, show a red error state on that placeholder thumbnail.
- Other parallel uploads continue unaffected.
- `onChange` is never called for a failed upload — no broken URLs enter the product data.

---

## UI

- **Drop zone:** Full-width dashed border box with "Drag images here or click to browse" label.
  - Hidden when `images.length + uploadingCount >= maxImages`.
  - On drag-over: border turns amber (`border-amber-500 bg-amber-50`).
- **Thumbnails grid:** `flex-wrap` row of 64×64px thumbnails (same style as existing form previews).
  - Uploaded: shows image with a red ✕ button top-right.
  - Uploading: grey placeholder with centered spinner.
  - Failed: grey placeholder with a small red error icon.
- **Order:** existing images first, then uploading placeholders appended in drop order.

---

## Changes to `ProductForm`

- Remove `newImageUrl` state and the URL-paste `<input>` + "Add" button.
- Replace the images section with `<ImageUploader images={images} onChange={setImages} maxImages={5} />`.
- No other changes to `ProductForm`.

---

## Storage Path Convention

```
products/{timestamp}_{originalFilename}
```

Example: `products/1712650000000_mug-front.jpg`

Timestamp prefix avoids collisions between products with identically named files.

---

## Files Touched

| File | Change |
|------|--------|
| `src/components/admin/ImageUploader.tsx` | New file |
| `src/components/admin/ProductForm.tsx` | Remove URL input, add `<ImageUploader>` |

No type changes, no API changes, no new dependencies.
