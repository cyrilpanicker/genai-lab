import { config } from 'dotenv';

config({ path: '.env.local' });

const query = process.argv.slice(2).join(' ');

if (!query) {
  console.error('Usage: pnpm semantic-search "your search query"');
  process.exit(1);
}

async function main() {
  const { semanticSearchNotes } = await import('../lib/semantic-search');

  const results = await semanticSearchNotes({
    query,
    limit: 3,
  });

  console.log(`\nQuery: ${query}\n`);

  for (const result of results) {
    console.log(`Score: ${result.score.toFixed(4)}`);
    console.log(`Title: ${result.note.title}`);
    console.log(`Content: ${result.note.content}`);
    console.log(`Tags: ${result.note.tags.join(', ')}`);
    console.log('---');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});