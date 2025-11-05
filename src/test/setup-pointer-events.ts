/**
 * Mock for Pointer Events - required for Radix UI components in testing
 *
 * Radix UI components use pointer capture which is not fully implemented in jsdom.
 * This mock provides the missing functionality for tests.
 */

// Mock hasPointerCapture if it doesn't exist
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = function () {
    return false;
  };
}

// Mock setPointerCapture if it doesn't exist
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function () {
    // no-op
  };
}

// Mock releasePointerCapture if it doesn't exist
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function () {
    // no-op
  };
}

// Mock scrollIntoView if it doesn't exist
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {
    // no-op
  };
}

export {};
