import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

/**
 * Mock Service Worker for browser (development)
 * This can be used during development to mock API responses
 */
export const worker = setupWorker(...handlers);
