/**
 * Minimal JavaScript action using @actions/core.
 *
 * In a real action you would:
 *   npm install @actions/core @actions/github
 *   npx @vercel/ncc build index.js -o dist  (bundle so the runner doesn't need npm install)
 *
 * For this demo the file is self-contained using process.env directly so it
 * runs without an npm install step (no node_modules required).
 */

// In production use: const core = require('@actions/core');
// For this demo, we replicate the key functions inline:
const core = {
  getInput: (name) => process.env[`INPUT_${name.toUpperCase().replace(/ /g, '_')}`] || '',
  setOutput: (name, value) => {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  },
  info: (msg) => console.log(msg),
  setFailed: (msg) => { console.error(`::error::${msg}`); process.exit(1); },
};

async function run() {
  try {
    const message = core.getInput('message') || 'Hello from a JavaScript action!';

    core.info(`Message received: ${message}`);
    core.info(`Repository: ${process.env.GITHUB_REPOSITORY}`);
    core.info(`Actor:      ${process.env.GITHUB_ACTOR}`);

    // Set the output so callers can read ${{ steps.<id>.outputs.result }}
    core.setOutput('result', message);

    core.info('Action completed successfully');
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
