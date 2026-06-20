import * as pdfjsLib from "pdfjs-dist/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ""}/pdf.worker.min.js`;

function groupTextItemsIntoLines(items) {
    const lines = [];
    let currentLine = [];
    let lastY = null;

    items.forEach((item) => {
        const y = item.transform?.[5];
        if (lastY !== null && y != null && Math.abs(y - lastY) > 4) {
            if (currentLine.length) {
                lines.push(currentLine.join(" ").trim());
                currentLine = [];
            }
        }
        if (item.str) {
            currentLine.push(item.str);
        }
        if (y != null) {
            lastY = y;
        }
    });

    if (currentLine.length) {
        lines.push(currentLine.join(" ").trim());
    }

    return lines.filter(Boolean);
}

export async function extractTextFromPdf(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";

    for (let page = 1; page <= pdf.numPages; page++) {
        const pageContent = await pdf.getPage(page);
        const content = await pageContent.getTextContent();
        text += groupTextItemsIntoLines(content.items).join("\n") + "\n";
    }

    return text.trim();
}

function stripQuestionPrefix(value) {
    return value.replace(/^\s*(?:\d+[.)]|Q\d+[.:)]|Question\s+\d+[.:)]|•|-)\s*/i, "").trim();
}

export function parseQuestionsFromText(text) {
    const normalized = text
        .replace(/\r/g, "\n")
        .replace(/\u2022/g, "\n• ")
        .replace(/\t/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!normalized) {
        return [];
    }

    const numberedPattern =
        /(?:^|\n|\s)(?=(?:\d+[.)]\s|Q\d+[.:)]\s|Question\s+\d+[.:)]\s|•\s|-\s))/gi;

    let candidates = normalized
        .split(numberedPattern)
        .map(stripQuestionPrefix)
        .map((chunk) => chunk.replace(/\s+/g, " ").trim())
        .filter((chunk) => chunk.length >= 8);

    if (candidates.length < 2) {
        candidates = normalized
            .split(/\n+/)
            .map(stripQuestionPrefix)
            .map((line) => line.replace(/\s+/g, " ").trim())
            .filter((line) => line.length >= 8);
    }

    if (candidates.length < 2) {
        candidates = normalized
            .split(/(?=\d+[.)]\s+)/)
            .map(stripQuestionPrefix)
            .map((chunk) => chunk.replace(/\s+/g, " ").trim())
            .filter((chunk) => chunk.length >= 8);
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
