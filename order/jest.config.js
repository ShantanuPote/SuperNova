/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    roots: [ '<rootDir>/test' ],
    setupFiles: [ '<rootDir>/test/setup/env.js' ],
    setupFilesAfterEnv: [ '<rootDir>/test/setup/mongodb.js' ],
};