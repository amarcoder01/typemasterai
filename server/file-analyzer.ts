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
          role: "system",
          content: `You are an expert image analyst. Provide comprehensive, detailed analysis of images. Your analysis should be thorough and actionable.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image comprehensively. Provide:

## Visual Analysis
- Main subject and scene description
- Objects, people, or elements visible
- Colors, lighting, and composition
- Any text visible (OCR) - transcribe exactly

## Technical Details
- Image type (photo, diagram, chart, screenshot, document, etc.)
- Quality assessment
- Notable visual elements

## Content Insights
- Key information or data shown
- If it's a chart/graph: explain the data and trends
- If it's a document: summarize the content
- If it's a screenshot: describe the application/context
- Any actionable insights or important details

Be thorough, specific, and helpful.`
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert document analyst. Analyze documents thoroughly and provide actionable insights. Be comprehensive but organized.`
        },
        {
          role: "user",
          content: `Analyze this PDF document content (${pageCount} pages):

---
${textForAnalysis}
${rawText.length > 8000 ? "\n[Document truncated - showing first 8000 characters]" : ""}
---

Provide a comprehensive analysis:

## Document Overview
- Document type (report, article, contract, form, etc.)
- Main topic/subject
- Author/source if identifiable

## Key Content Summary
- Main points and findings
- Important data, facts, or figures
- Critical information highlighted

## Detailed Analysis
- Structure and organization
- Key sections breakdown
- Notable quotes or statements

## Insights & Recommendations
- Key takeaways
- Action items if applicable
- Questions this document answers

Be thorough and extract maximum value from this document.`
        }
      ],
      max_tokens: 2500,
      temperature: 0.3,
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
    
    console.log(`[File Analyzer] Extracted ${textForAnalysis.length} chars, sending to GPT-4o for analysis...`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert document analyst. Analyze documents thoroughly and provide actionable insights.`
        },
        {
          role: "user",
          content: `Analyze this Word document content:

---
${textForAnalysis}
${rawText.length > 8000 ? "\n[Document truncated - showing first 8000 characters]" : ""}
---

Provide a comprehensive analysis:

## Document Overview
- Document type and purpose
- Main topic/subject
- Target audience

## Content Summary
- Key points and main ideas
- Important information
- Structure overview

## Detailed Analysis
- Key sections breakdown
- Notable content
- Data or facts mentioned

## Insights
- Key takeaways
- Recommendations if applicable

Be thorough and helpful.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
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

    console.log(`[File Analyzer] Text file detected as ${isCode ? 'code' : 'text'}, sending to GPT-4o...`);

    const prompt = isCode ? 
      `Analyze this code file:

---
${textForAnalysis}
${rawText.length > 8000 ? "\n[File truncated]" : ""}
---

Provide:
## Code Overview
- Programming language
- Purpose/functionality
- Main components (functions, classes, etc.)

## Code Analysis
- Key logic and flow
- Dependencies used
- Notable patterns

## Quality Assessment
- Code structure
- Potential improvements
- Any issues or bugs spotted

## Summary
- What this code does
- How to use it` :
      `Analyze this text file:

---
${textForAnalysis}
${rawText.length > 8000 ? "\n[File truncated]" : ""}
---

Provide:
## Content Overview
- Type of content
- Main topic

## Summary
- Key points
- Important information

## Analysis
- Structure
- Notable content
- Insights`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: isCode ? 
            "You are an expert code analyst. Analyze code thoroughly." :
            "You are an expert content analyst. Analyze text content thoroughly."
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.3,
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
