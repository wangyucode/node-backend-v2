export default {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/*.test.js'],
    moduleFileExtensions: ['js', 'json', 'node'],
    transform: {
        '^.+\.js$': 'babel-jest'
    },
};