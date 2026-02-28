const { copyFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const sourceIcon = join(__dirname, '..', 'nodes', 'UserApi', 'userapi.svg');
const targetDir = join(__dirname, '..', 'dist', 'nodes', 'UserApi');
const targetIcon = join(targetDir, 'userapi.svg');

mkdirSync(targetDir, { recursive: true });
copyFileSync(sourceIcon, targetIcon);
