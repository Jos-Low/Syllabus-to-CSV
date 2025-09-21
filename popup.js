import apiKeys from "./hidden.js";

const mistralApiKey = apiKeys.mistralApiKey;
const geminiApiKey = apiKeys.geminiApiKey;

document.getElementById('file-upload').addEventListener('change', async (event) => {
    const fileUploaded = event.target.files[0];
    if (!fileUploaded) return;

    const form = new FormData();
    form.append('purpose', 'ocr');
    form.append('file', new File([fileUploaded], `${fileUploaded.name}`));

    const PDFJson = await PDFToJson(form);
    console.log("PDF JSON:", PDFJson);

    const fileID = PDFJson.id;
    const response = await fetch(`https://api.mistral.ai/v1/files/${fileID}/url?expiry=24`, {
        method: 'GET',
        headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${mistralApiKey}`
        }
    });

    const fileUrlJson = await response.json();
    console.log("File URL JSON:", fileUrlJson);

    const body = JSON.stringify({
        model: "mistral-ocr-latest",
        document: {
            type: "document_url",
            document_url: fileUrlJson.url
        },
        include_image_base64: true
    });

    const ocrCall = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${mistralApiKey}`
        },
        body: body
    });

    const ocrJson = await ocrCall.json();
    console.log("OCR JSON:", ocrJson);

    let extractedText = "";
    for (const page of ocrJson.pages) {
        extractedText += page.markdown + "\n";
    }
    console.log("Extracted Markdown:", extractedText);

    const geminiJson = await JsonToCSV(extractedText);
    console.log("Gemini JSON:", geminiJson);

    const geminiResponse = geminiJson.candidates[0].content.parts[0].text;

    // Strip code fences and clean CSV
    const cleanedCSV = geminiResponse
        .replace(/^```csv/, "")
        .replace(/```$/, "")
        .trim();

    createFileAndDownload("assignments.csv", cleanedCSV);
});

/*
    Convert PDF to JSON object
    @param {FormData} form
    @returns {Promise<Object>}
*/
async function PDFToJson(form) {
    const uploadedPDF = await fetch('https://api.mistral.ai/v1/files', {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${mistralApiKey}`
        },
        body: form,
    });
    const PDFJson = await uploadedPDF.json();
    return PDFJson;
}

async function JsonToCSV(markdownExport) {
    const prompt = `
Extract all assignments from the following syllabus Markdown.
Output the results as CSV with these columns:
Due Date, Class, Assignment Name, Assignment Type (Homework, Reading, Project, Exam), Checkbox.
Here is the syllabus Markdown:

${markdownExport}
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
}

// Downloadable file
function createFileAndDownload(filename, content) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}

