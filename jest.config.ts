import type { Config } from "jest";

const config: Config = {
    // Keep existing settings
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageProvider: "v8",

    // Add TypeScript support
    preset: "ts-jest",
    testEnvironment: "node",

    // Test file patterns
    testMatch: [
        "**/__tests__/**/*.spec.ts",
        "**/__tests__/**/*.test.ts",
        "**/*.spec.ts",
        "**/*.test.ts",
    ],

    // File extensions
    moduleFileExtensions: ["ts", "js", "json", "node"],

    // Transform TypeScript files
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: "tsconfig.json",
            },
        ],
    },

    // Setup files for database testing
    setupFilesAfterEnv: ["./jest.setup.ts"],

    // Global variables
    globals: {
        "ts-jest": {
            isolatedModules: true,
        },
    },
};

export default config;
