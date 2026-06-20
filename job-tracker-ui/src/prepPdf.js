import * as pdfjsLib from "pdfjs-dist/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

export async function extractTextFromPdf(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";

    for (let page = 1; page <= pdf.numPages; page++) {
        const pageContent = await pdf.getPage(page);
        const content = await pageContent.getTextContent();
        text += content.items.map((item) => item.str).join(" ") + "\n";
    }

    return text;
}

export function parseQuestionsFromText(text) {
    const normalized = text
        .replace(/\r/g, "\n")
        .replace(/\u2022/g, "\n• ")
        .replace(/\t/g, " ");

    const chunks = normalized.split(
        /\n(?=\s*(?:\d+[.)]\s|Q\d+[.:)]\s|Question\s+\d+[.:)]\s|•\s|-\s))/gi
    );

    let candidates = chunks
        .map((chunk) =>
            chunk.replace(/^\s*(?:\d+[.)]|Q\d+[.:)]|Question\s+\d+[.:)]|•|-)\s*/i, "").trim()
        )
        .map((chunk) => chunk.replace(/\s+/g, " ").trim())
        .filter((chunk) => chunk.length >= 8);

    if (candidates.length < 2) {
        candidates = normalized
            .split(/\n+/)
            .map((line) => line.replace(/^\s*(?:\d+[.)]|•|-)\s*/, "").trim())
            .filter((line) => line.length >= 8);
    }

    const seen = new Set();
    const unique = [];
    candidates.forEach((question) => {
        const key = question.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(question);
        }
    });

    return unique;
}
