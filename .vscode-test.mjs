import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	launchArgs: [
		process.cwd(),
		'--disable-extensions',
		'--disable-extension=GitHub.copilot',
		'--disable-extension=GitHub.copilot-chat'
	],
});
