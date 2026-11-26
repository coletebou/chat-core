// Build dist/ from scratch: a stale file from a module since removed must not ship.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });
execFileSync(process.execPath, ['node_modules/tsrs/bin/tsrs', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });
