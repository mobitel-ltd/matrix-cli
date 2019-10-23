test:
	npm test

dev:
	node src/bin/index.dev.js

start:
	node src/bin/index.js

publish:
	npm publish

watch:
	npm run test:watch

cover:
	npm run test:coverage