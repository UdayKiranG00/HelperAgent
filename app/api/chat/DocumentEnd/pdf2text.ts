import { pdfToImg } from "pdftoimg-js";
import fs from "fs";
import { createWorker } from "tesseract.js";
import path from "path";
import {
  GlobalWorkerOptions,
  getDocument,
  OPS,
} from "./node_modules/pdfjs-dist/webpack.mjs"; // ESM import

//fn for ocr pdf's pdf->text->text file
async function extractOcrPdf(pdfFilePath, textFilePath) {
  const loadingTask = getDocument({
    url: pdfFilePath,
  });
  const pdf = await loadingTask.promise;
  const samplePage = await pdf.getPage(1);
  const sample = await samplePage.getTextContent();
  //console.log("sample size" , sample.items.length);
  if (sample.items.length === 0) return false;
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item) => item.str && item.transform) // ignore images
      .map((item) => item.str)
      .join("\n");
    await fs.writeFileSync(textFilePath, text, { flag: "a" });
  }
  return true;
}

// for non-ocr pdf->images->ocr->text->text file.
function saveBase64ToDisk(base64Url, imagePath) {
  // Remove the data URL prefix to get just the raw base64 data
  const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");

  // Convert the base64 string into a binary buffer
  const buffer = Buffer.from(base64Data, "base64");

  // Write the buffer to a file
  fs.writeFileSync(imagePath, buffer);
  console.log(`Image saved successfully to ${imagePath}`);
}
async function extractTextFromImage(imageFilePath, textFilePath) {
  //async function extractTextFromImage(imageFilePath,textFilePath) {
  // 1. Create a Tesseract worker and initialize it with the target language
  const worker = await createWorker("eng"); // 'eng' for English

  try {
    console.log("Recognizing text...");

    // 2. Perform OCR on the image
    const {
      data: { text },
    } = await worker.recognize(imageFilePath);

    console.log("\n--- Extracted Text ---");
    //await fs.appendFile("E:/Projects/example.txt",text,"utf-8");
    await fs.writeFileSync(textFilePath, text, { flag: "a" });
  } catch (error) {
    console.error("Error during OCR processing:", error);
  } finally {
    // 3. Always terminate the worker to free up memory
    await worker.terminate();
  }
}

async function nonOcrToPdf(pdfFilePath, textFilePath) {
  let baseName = path.basename(pdfFilePath, ".pdf");
  let outputDir = "./NonOcrPdf-Images/" + baseName + "/";

  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory: ${err.message}`);
  }

  const dataUrl = await pdfToImg(pdfFilePath, {
    scale: 3,
  });

  //Example usage:
  for (let index = 0; index < dataUrl.length; index++) {
    //await dataUrl.forEach((myBase64Url,index)=>{
    let myBase64Url = dataUrl[index];

    saveBase64ToDisk(myBase64Url, outputDir + "image_" + index + ".png");

    await extractTextFromImage(
      outputDir + "image_" + index + ".png",
      textFilePath,
    );
  }
}

export { nonOcrToPdf, extractOcrPdf };
