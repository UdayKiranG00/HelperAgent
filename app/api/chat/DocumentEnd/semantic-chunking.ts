import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
// Helper to calculate cosine similarity between two vector arrays
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}

async function chunkMyDocument(rawText, similarityThreshold = 0.7) {
  const chromaEmbedder = new DefaultEmbeddingFunction();

  // 1. Split the text into individual sentences
  const sentences = rawText.match(/[^.!?]+[.!?]+/g) || [rawText];
  if (sentences.length <= 1) return sentences;

  // 2. Generate vector embeddings for all sentences batch wise
  const BATCH_SIZE = 64;
  const embeddings = [];
  let j = 0;
  // 2. Iterate through sentences in chunks
  for (j = 0; j + BATCH_SIZE < sentences.length; j += BATCH_SIZE) {
    const batch = sentences.slice(j, j + BATCH_SIZE);
    //console.log(`Embedding chunk ${Math.floor(j / BATCH_SIZE) + 1}...`);
    // Generate embeddings for just this small batch
    const batchEmbeddings = await chromaEmbedder.generate(batch);
    // Push the batch results into your master array
    embeddings.push(...batchEmbeddings);
  }
  //const embeddings = await chromaEmbedder.generate(sentences);
  const remBatch = sentences.slice(j,j+sentences.length);
  const remBatchEmbeddings = await chromaEmbedder.generate(remBatch);
  embeddings.push(...remBatchEmbeddings);
  const chunks = [];
  let currentChunk = sentences[0];

  // 3. Compare adjacent sentences to catch topic shifts
  for (let i = 1; i < sentences.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);

    // If the similarity drops below your threshold, seal the chunk and start a new one
    if (similarity < similarityThreshold) {
      chunks.push(currentChunk.trim());
      currentChunk = sentences[i];
    } else {
      // Otherwise, keep appending sentences to the current semantic block
      currentChunk += " " + sentences[i];
    }
  }
  //console.log('chunks length: ' + chunks.length);
  //console.log('sample chunk'+ chunks[0]);
  // Push the remaining text group
  chunks.push(currentChunk.trim());
  return chunks;
}
export { chunkMyDocument };
