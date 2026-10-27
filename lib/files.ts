// Upload rules for product files. Uploaded files are untrusted: type and size are checked here,
// workflow JSON is scanned, and everything goes to private storage.

export type FileKind = "workflow" | "readme" | "install_guide" | "example_config" | "changelog" | "screenshot" | "sample";

export const FILE_RULES: Record<FileKind, { label: string; extensions: string[]; mimes: string[]; maxBytes: number }> = {
  workflow: { label: "n8n workflow (.json)", extensions: [".json"], mimes: ["application/json"], maxBytes: 2 * 1024 * 1024 },
  readme: { label: "README (.md, .txt)", extensions: [".md", ".txt"], mimes: ["text/markdown", "text/plain"], maxBytes: 512 * 1024 },
  install_guide: { label: "Installation guide (.md, .txt)", extensions: [".md", ".txt"], mimes: ["text/markdown", "text/plain"], maxBytes: 1024 * 1024 },
  example_config: { label: "Example configuration (.json)", extensions: [".json"], mimes: ["application/json"], maxBytes: 512 * 1024 },
  changelog: { label: "Changelog (.md, .txt)", extensions: [".md", ".txt"], mimes: ["text/markdown", "text/plain"], maxBytes: 256 * 1024 },
  screenshot: { label: "Screenshot (.png, .jpg, .webp)", extensions: [".png", ".jpg", ".jpeg", ".webp"], mimes: ["image/png", "image/jpeg", "image/webp"], maxBytes: 3 * 1024 * 1024 },
  sample: { label: "Sample input/output (.json, .csv, .txt)", extensions: [".json", ".csv", ".txt"], mimes: ["application/json", "text/csv", "text/plain"], maxBytes: 1024 * 1024 },
};

const MAGIC: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
};

export function extensionOf(name: string): string {
  const m = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : "";
}

/** Returns the storage MIME type to use, or an error. The extension and content decide, not the browser's claim. */
export function checkFile(kind: FileKind, name: string, bytes: Uint8Array): { ok: true; mime: string } | { ok: false; error: string } {
  const rule = FILE_RULES[kind];
  const ext = extensionOf(name);
  if (!rule.extensions.includes(ext)) return { ok: false, error: `${rule.label}: unsupported file type ${ext || "(none)"}` };
  if (bytes.length === 0) return { ok: false, error: "The file is empty" };
  if (bytes.length > rule.maxBytes) return { ok: false, error: `${rule.label}: file is larger than ${Math.round(rule.maxBytes / 1024)} KB` };
  const mime = ext === ".json" ? "application/json" : ext === ".md" ? "text/markdown" : ext === ".csv" ? "text/csv"
    : ext === ".txt" ? "text/plain" : ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const magic = MAGIC[mime];
  if (magic && !magic.every((b, i) => bytes[i] === b)) return { ok: false, error: "The file content does not match its extension" };
  if (mime.startsWith("text/") || mime === "application/json") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return { ok: false, error: "Text files must be UTF-8" };
    }
  }
  return { ok: true, mime };
}

/** Safe storage file name: lowercase, no path separators. */
export function safeFileName(name: string): string {
  const ext = extensionOf(name);
  const base = name.slice(0, name.length - ext.length).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return (base || "file") + ext;
}
