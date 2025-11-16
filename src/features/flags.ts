/**
 * Feature Flags Module
 *
 * Universal module for managing feature flags across frontend and backend.
 * Supports environment-based configuration (local, integration, production).
 *
 * Usage:
 * - API endpoints: Check flags and return appropriate responses
 * - Astro pages: Check flags and redirect if disabled
 * - React components: Check flags and conditionally render
 */

/**
 * Supported environments
 */
export type Environment = "local" | "integration" | "production";

/**
 * Feature flag names
 */
export type FeatureFlag = "auth" | "settings" | "offerdetails" | "offers";

/**
 * Feature flags configuration per environment
 */
type FeatureFlagsConfig = Record<FeatureFlag, boolean>;

/**
 * Environment-based feature flags configuration
 */
const FEATURE_FLAGS: Record<Environment, FeatureFlagsConfig> = {
  local: {
    auth: true,
    settings: true,
    offerdetails: true,
    offers: true,
  },
  integration: {
    auth: true,
    settings: true,
    offerdetails: true,
    offers: true,
  },
  production: {
    auth: true,
    settings: true,
    offerdetails: true,
    offers: true,
  },
};

/**
 * Gets the current environment from ENV_NAME environment variable.
 * Falls back to "local" if not set or invalid.
 *
 * @returns Current environment
 */
export function getCurrentEnvironment(): Environment {
  const envName = import.meta.env.ENV_NAME;

  // Normalize environment name
  if (envName === "local" || envName === "integration" || envName === "production") {
    return envName;
  }

  // Default to local if not set or invalid
  return "local";
}

/**
 * Checks if a feature flag is enabled for the current environment.
 * Returns true by default if flag is not configured (fail-safe).
 *
 * @param flag - Feature flag name to check
 * @param environment - Optional environment override (defaults to current environment)
 * @returns true if feature is enabled, false otherwise
 */
export function isFeatureEnabled(flag: FeatureFlag, environment?: Environment): boolean {
  const env = environment ?? getCurrentEnvironment();
  const config = FEATURE_FLAGS[env];

  // Default to enabled if flag is not configured (fail-safe)
  if (!config || !(flag in config)) {
    return true;
  }

  return config[flag] === true;
}

/**
 * Gets all feature flags for the current environment.
 *
 * @param environment - Optional environment override (defaults to current environment)
 * @returns Object with all feature flags and their enabled status
 */
export function getAllFeatureFlags(environment?: Environment): FeatureFlagsConfig {
  const env = environment ?? getCurrentEnvironment();
  const config = FEATURE_FLAGS[env];

  // Return default enabled flags if config is missing
  if (!config) {
    return {
      auth: true,
      settings: true,
      offerdetails: true,
      offers: true,
    };
  }

  return { ...config };
}

/**
 * Type guard to check if a string is a valid environment name
 */
export function isValidEnvironment(value: string): value is Environment {
  return value === "local" || value === "integration" || value === "production";
}

/**
 * Type guard to check if a string is a valid feature flag name
 */
export function isValidFeatureFlag(value: string): value is FeatureFlag {
  return value === "auth" || value === "settings" || value === "offerdetails" || value === "offers";
}
