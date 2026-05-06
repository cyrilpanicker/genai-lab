import { config } from "dotenv";

config({ path: ".env.local" });

const question = process.argv.slice(2).join(" ");

if (!question) {
  console.error('Usage: pnpm rag "your question here"');
  process.exit(1);
}

async function main() {
  const { answerFromNotes } = await import("../lib/rag-answer");

  const result = await answerFromNotes(question);

  console.log("\nQuestion:");
  console.log(question);

  console.log("\nAnswer:");
  console.log(result.answer);

  console.log("\nSources:");
  for (const source of result.sources) {
    console.log(`- ${source.id}: ${source.title} (${source.score.toFixed(4)})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
