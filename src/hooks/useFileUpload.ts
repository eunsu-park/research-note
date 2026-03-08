"use client";

/** Upload a file to the attachments API and return the markdown snippet */
export async function uploadFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/attachments", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) return null;
    const { data } = await res.json();
    if (!data?.url) return null;

    // Return appropriate markdown based on file type
    if (file.type.startsWith("image/")) {
      return `![${file.name}](${data.url})`;
    }
    return `[${file.name}](${data.url})`;
  } catch {
    return null;
  }
}

/** Upload multiple files and return combined markdown */
export async function uploadFiles(files: File[]): Promise<string> {
  const results = await Promise.all(files.map(uploadFile));
  return results.filter(Boolean).join("\n");
}
