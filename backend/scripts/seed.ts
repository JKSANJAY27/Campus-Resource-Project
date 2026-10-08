import { runSeeder } from '../src/generator/seed.js';
import { dbManager } from '../src/config/database.js';

async function main() {
  const args = process.argv.slice(2);
  let scale: 'small' | 'medium' | 'large' = 'small';
  let seed = 42;

  for (const arg of args) {
    if (arg.startsWith('--scale=')) {
      const val = arg.split('=')[1].toLowerCase();
      if (val === 'small' || val === 'medium' || val === 'large') {
        scale = val;
      }
    } else if (arg.startsWith('--seed=')) {
      seed = parseInt(arg.split('=')[1], 10) || 42;
    }
  }

  try {
    await runSeeder({ scale, seed, exportJson: true });
  } catch (err) {
    console.error('Fatal error during seed:', err);
    process.exit(1);
  } finally {
    await dbManager.disconnectAll();
  }
}

main();
