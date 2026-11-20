import type { PDFDocumentProxy } from "pdfjs-dist";

export const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const PDF_MAX_PAGES = 50;
export const RESUME_MAX_CHARS = 30_000;

export type ParsedResume = {
  text: string;
  pageCount: number;
};

export class PdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfError";
  }
}

function cleanPageText(items: unknown[]): string {
  let output = "";
  let previousY: number | null = null;

  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object" || !("str" in rawItem)) continue;
    const item = rawItem as { str: string; transform?: number[]; hasEOL?: boolean };
    const currentY: number | null = item.transform?.[5] ?? previousY;

    if (previousY !== null && currentY !== null && Math.abs(currentY - previousY) > 5) {
      output = output.trimEnd() + "\n";
    } else if (output && !/[\s\p{Script=Han}]$/u.test(output) && /^[A-Za-z0-9]/.test(item.str)) {
      output += " ";
    }

    output += item.str;
    if (item.hasEOL) output = output.trimEnd() + "\n";
    previousY = currentY;
  }

  return output
    .replace(/[\t\u0000]/g, " ")
    .replace(/ +/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractPdfText(file: File): Promise<ParsedResume> {
  if (file.size > PDF_MAX_BYTES) throw new PdfError("文件超过 10 MB，请压缩或精简后重新上传。");
  if (file.size === 0) throw new PdfError("这个文件是空的，请重新选择 PDF 简历。");

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let pdfDocument: PDFDocumentProxy;
  try {
    pdfDocument = await loadingTask.promise;
  } catch (error) {
    await loadingTask.destroy();
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") throw new PdfError("该 PDF 已加密，请移除密码后重新上传。");
    throw new PdfError("无法读取该 PDF，文件可能已损坏，请重新导出后再试。");
  }

  try {
    if (pdfDocument.numPages > PDF_MAX_PAGES) {
      throw new PdfError(`该 PDF 共 ${pdfDocument.numPages} 页，超过 50 页限制，请精简后上传。`);
    }

    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(cleanPageText(content.items));
      page.cleanup();
    }

    const text = pages.join("\n\n").trim();
    const meaningfulCharacters = text.replace(/\s/g, "").length;
    if (meaningfulCharacters < 50) {
      throw new PdfError("没有提取到足够的简历文字。该文件可能是扫描件，请使用带文本层的 PDF。");
    }
    if (text.length > RESUME_MAX_CHARS) {
      throw new PdfError(`提取到 ${text.length.toLocaleString()} 个字符，超过 30,000 字符限制，请精简简历。`);
    }

    return { text, pageCount: pdfDocument.numPages };
  } finally {
    await loadingTask.destroy();
  }
}


