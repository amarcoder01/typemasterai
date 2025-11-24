import OpenAI from "openai";
import mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export async function analyzeImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image in detail. Describe what you see, including any text, objects, people, scenes, colors, and any other relevant details. Be thorough and specific."
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || "Unable to analyze image";
  } catch (error) {
    console.error("Image analysis error:", error);
    throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzePDF(buffer: Buffer): Promise<string> {
  try {
    // Use require for pdf-parse CommonJS module
    // @ts-ignore
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);
    const text = data.text.trim();

    if (!text) {
      return "PDF appears to be empty or contains only images.";
    }

    // Return first 3000 characters of extracted text
    const extractedText = text.substring(0, 3000);
    const truncated = text.length > 3000 ? "... (truncated)" : "";

    return `**PDF Content Extracted:**\n\n${extractedText}${truncated}\n\n**Pages:** ${data.numpages}`;
  } catch (error) {
    console.error("PDF analysis error:", error);
    throw new Error(`PDF analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeWordDocument(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();

    if (!text) {
      return "Word document appears to be empty.";
    }

    // Return first 3000 characters of extracted text
    const extractedText = text.substring(0, 3000);
    const truncated = text.length > 3000 ? "... (truncated)" : "";

    return `**Word Document Content Extracted:**\n\n${extractedText}${truncated}`;
  } catch (error) {
    console.error("Word document analysis error:", error);
    throw new Error(`Word document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeTextFile(buffer: Buffer): Promise<string> {
  try {
    const text = buffer.toString('utf-8').trim();

    if (!text) {
      return "Text file appears to be empty.";
    }

    // Return first 3000 characters
    const extractedText = text.substring(0, 3000);
    const truncated = text.length > 3000 ? "... (truncated)" : "";

    return `**Text File Content:**\n\n${extractedText}${truncated}`;
  } catch (error) {
    console.error("Text file analysis error:", error);
    throw new Error(`Text file analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeFile(file: any): Promise<string> {
  const { buffer, mimetype, originalname } = file;

  try {
    // Image analysis
    if (mimetype.startsWith('image/')) {
      return await analyzeImage(buffer, mimetype);
    }

    // PDF analysis
    if (mimetype === 'application/pdf') {
      return await analyzePDF(buffer);
    }

    // Word document analysis
    if (
      mimetype === 'application/msword' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return await analyzeWordDocument(buffer);
    }

    // Text file analysis
    if (mimetype === 'text/plain') {
      return await analyzeTextFile(buffer);
    }

    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    console.error(`Error analyzing file ${originalname}:`, error);
    throw error;
  }
}
