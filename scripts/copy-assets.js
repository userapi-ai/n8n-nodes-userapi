const { copyFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');

// tsc emits only .js; the icons and the codex file are copied next to it.
const assets = [
	['nodes/UserApi/userapi.svg', 'dist/nodes/UserApi/userapi.svg'],
	['nodes/UserApi/UserApi.node.json', 'dist/nodes/UserApi/UserApi.node.json'],
	['credentials/userapi.svg', 'dist/credentials/userapi.svg'],
];

for (const [from, to] of assets) {
	mkdirSync(join(root, to, '..'), { recursive: true });
	copyFileSync(join(root, from), join(root, to));
}
