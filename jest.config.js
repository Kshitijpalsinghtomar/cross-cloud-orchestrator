module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    projects: [
        '<rootDir>/packages/core',
        '<rootDir>/packages/adapters',
        '<rootDir>/packages/api',
        '<rootDir>/packages/worker'
    ]
};
