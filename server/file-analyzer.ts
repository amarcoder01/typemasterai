import OpenAI from "openai";
import mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    console.log("[File Analyzer] Analyzing image with GPT-4o Vision...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image concisely:
1. What it shows (main subject, key elements)
2. Any text visible (transcribe exactly)
3. Key data/information if chart/diagram/document
4. Important insights or actionable details

Keep response focused and useful.`
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "auto"
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const analysis = response.choices[0]?.message?.content || "Unable to analyze image";
    console.log("[File Analyzer] Image analysis complete");
    return analysis;
  } catch (error) {
    console.error("[File Analyzer] Image analysis error:", error);
    throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzePDF(buffer: Buffer): Promise<string> {
  let parser: any = null;
  
  try {
    console.log("[File Analyzer] Extracting PDF content...");
    
    const { PDFParse } = await import("pdf-parse");
    
    const uint8Array = new Uint8Array(buffer);
    parser = new PDFParse({ data: uint8Array });
    
    const result = await parser.getText();
    const rawText = result.text?.trim() || "";

    if (!rawText) {
      return "PDF appears to be empty or contains only images. Please try uploading an image version of the document for visual analysis.";
    }

    const textForAnalysis = rawText.substring(0, 8000);
    const pageCount = result.total || result.pages?.length || 1;
    
    console.log(`[File Analyzer] Extracted ${textForAnalysis.length} chars from ${pageCount} pages, sending to GPT-4o for analysis...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Analyze this document (${pageCount} pages):

${textForAnalysis}
${rawText.length > 8000 ? "\n[Truncated]" : ""}

Provide:
1. Document type and main topic
2. Key points and important data
3. Notable findings or insights
4. Action items if applicable

Be concise and focus on what matters.`
        }
      ],
      max_tokens: 1200,
      temperature: 0.2,
    });

    const aiAnalysis = response.choices[0]?.message?.content || "";
    console.log("[File Analyzer] PDF analysis complete");

    return aiAnalysis;
  } catch (error) {
    console.error("[File Analyzer] PDF analysis error:", error);
    throw new Error(`PDF analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try {
        await parser.destroy();
      } catch (e) {
        console.log("[File Analyzer] Parser cleanup completed");
      }
    }
  }
}

export async function analyzeWordDocument(buffer: Buffer): Promise<string> {
  try {
    console.log("[File Analyzer] Extracting Word document content...");
    
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value.trim();

    if (!rawText) {
      return "Word document appears to be empty.";
    }

    const textForAnalysis = rawText.substring(0, 8000);
    
    console.log(`[File Analyzer] Extracted ${textForAnalysis.length} chars, sending to GPT-4o-mini for analysis...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Analyze this document:

${textForAnalysis}
${rawText.length > 8000 ? "\n[Truncated]" : ""}

Provide:
1. Document type and main topic
2. Key points and important information
3. Notable findings or insights
4. Action items if applicable

Be concise and focus on what matters.`
        }
      ],
      max_tokens: 1200,
      temperature: 0.2,
    });

    const aiAnalysis = response.choices[0]?.message?.content || "";
    console.log("[File Analyzer] Word document analysis complete");

    return aiAnalysis;
  } catch (error) {
    console.error("[File Analyzer] Word document analysis error:", error);
    throw new Error(`Word document analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeTextFile(buffer: Buffer): Promise<string> {
  try {
    console.log("[File Analyzer] Processing text file...");
    
    const rawText = buffer.toString('utf-8').trim();

    if (!rawText) {
      return "Text file appears to be empty.";
    }

    const textForAnalysis = rawText.substring(0, 8000);

    const isCode = /^(import |from |const |let |var |function |class |def |public |private |#include|package |using )/.test(rawText) ||
                   rawText.includes('function(') || rawText.includes('=>') || rawText.includes('{}');

    console.log(`[File Analyzer] Text file detected as ${isCode ? 'code' : 'text'}, sending to GPT-4o-mini...`);

    const prompt = isCode ? 
      `Analyze this code:

${textForAnalysis}
${rawText.length > 8000 ? "\n[Truncated]" : ""}

Provide:
1. Language and purpose
2. Main functions/components
3. Key logic and what it does
4. Any issues or improvements

Be concise.` :
      `Analyze this text:

${textForAnalysis}
${rawText.length > 8000 ? "\n[Truncated]" : ""}

Provide:
1. Content type and topic
2. Key points
3. Notable information
4. Insights

Be concise.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.2,
    });

    const aiAnalysis = response.choices[0]?.message?.content || "";
    console.log("[File Analyzer] Text file analysis complete");

    return aiAnalysis;
  } catch (error) {
    console.error("[File Analyzer] Text file analysis error:", error);
    throw new Error(`Text file analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function analyzeFile(file: any): Promise<string> {
  const { buffer, mimetype, originalname } = file;
  const fileSize = buffer.length;
  const fileSizeKB = (fileSize / 1024).toFixed(1);

  console.log(`[File Analyzer] Starting analysis of "${originalname}" (${fileSizeKB} KB, ${mimetype})`);

  try {
    let analysis: string;

    if (mimetype.startsWith('image/')) {
      analysis = await analyzeImage(buffer, mimetype);
    } else if (mimetype === 'application/pdf') {
      analysis = await analyzePDF(buffer);
    } else if (
      mimetype === 'application/msword' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      analysis = await analyzeWordDocument(buffer);
    } else if (mimetype === 'text/plain') {
      analysis = await analyzeTextFile(buffer);
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    return `# File Analysis: ${originalname}\n\n${analysis}`;
  } catch (error) {
    console.error(`[File Analyzer] Error analyzing file ${originalname}:`, error);
    throw error;
  }
}
