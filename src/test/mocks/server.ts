import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Mock Service Worker server for Node.js (unit tests)
 * This is used in Vitest tests to intercept HTTP requests
 */
export const server = setupServer(...handlers);
