// PreToolUse: block edits to secrets, lockfile, certs, and applied Prisma migrations.
let raw = '';
process.stdin.on('data', (d) => (raw += d));
process.stdin.on('end', () => {
  let file = '';
  try {
    file = (JSON.parse(raw).tool_input?.file_path || '').replaceAll('\\', '/');
  } catch {
    return;
  }
  const rules = [
    [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, 'environment files hold secrets'],
    [/(^|\/)package-lock\.json$/, 'change the lockfile via npm, not by hand'],
    [/\/cert\//, 'SSL certificates are sensitive'],
    [/\.(pem|key|crt)$/, 'key/certificate files are sensitive'],
    [
      /\/prisma\/migrations\/.+\.sql$/,
      'edit prisma/schema.prisma and run `npx prisma migrate dev` instead',
    ],
  ];
  for (const [re, why] of rules) {
    if (re.test(file)) {
      console.error(`Blocked edit to ${file}: ${why}.`);
      process.exit(2);
    }
  }
});
