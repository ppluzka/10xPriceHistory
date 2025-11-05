import { http, HttpResponse } from "msw";

/**
 * MSW request handlers for mocking API requests
 * Add your API endpoint mocks here
 */
export const handlers = [
  // Example: Mock auth check endpoint
  http.get("/api/auth/check", () => {
    return HttpResponse.json({
      user: null,
      authenticated: false,
    });
  }),

  // Example: Mock offers endpoint
  http.get("/api/offers", () => {
    return HttpResponse.json({
      data: [],
      error: null,
    });
  }),

  // Add more handlers as needed
];
