import { config } from 'dotenv';

config({ path: '.env.local' });

const userMessage = process.argv.slice(2).join(' ');

if (!userMessage) {
  console.error('Usage: pnpm agent "your request here"');
  process.exit(1);
}

async function main() {
  const { runMiniAgent } = await import('../lib/agent/mini-agent');

  const result = await runMiniAgent(userMessage);

  console.log('\nAgent final state:');
  console.log(JSON.stringify(result, null, 2));

  console.log('\nFinal response:');
  console.log(result.finalResponse);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});