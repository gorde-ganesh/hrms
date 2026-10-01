// PostToolUse: run prettier on files Claude edited. Never blocks.
const { spawnSync } = require('child_process');
const path = require('path');
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  try {
    const file = JSON.parse(raw).tool_input?.file_path;
    if (!file || !/\.(ts|js|json|html|css|scss|md)$/.test(file)) return;
    if (
      /node_modules|package-lock\.json|[\\/]migrations[\\/]|[\\/]generated[\\/]/.test(
        file
      )
    )
      return;
    const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const bin = path.join(
      root,
      'node_modules',
      'prettier',
      'bin',
      'prettier.cjs'
    );
    spawnSync(process.execPath, [bin, '--write', file], {
      cwd: root,
      stdio: 'ignore',
    });
  } catch {}
});
