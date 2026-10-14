import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { GeoLocationData } from "../types/index.js";

/**
 * Checks if an IP is a private, loopback, or local IP address.
 */
function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
    return true;
  }
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") ||
    ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") ||
    ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") ||
    ip.startsWith("172.26.") ||
    ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") ||
    ip.startsWith("172.29.") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.") ||
    ip.startsWith("fc00:") ||
    ip.startsWith("fe80:")
  );
}

export const geoService = {
  /**
   * Enrich visitor IP with geolocation using an ordered fallback chain:
   * Provider A (ipstack or ip-api.com) -> Provider B (ipapi.co) -> Graceful degradation
   */
  async enrichIp(rawIp: string | undefined): Promise<GeoLocationData> {
    const ip = rawIp?.trim() || "127.0.0.1";

    // Handle local/private IPs in development
    if (isPrivateOrLocalIp(ip)) {
      if (env.MOCK_GEO_PROVIDER_A_FAIL && env.MOCK_GEO_PROVIDER_B_FAIL) {
        logger.info("[GeoService] Both providers mocked down for local IP test -> Degraded");
        return {
          ip,
          enriched: false,
          provider: "none",
        };
      }

      if (env.MOCK_GEO_PROVIDER_A_FAIL) {
        logger.info("[GeoService] Provider A mocked down for local IP test -> Fallback to Provider B");
        return {
          ip,
          country: "United States",
          country_code: "US",
          city: "Austin",
          region: "Texas",
          latitude: 30.2672,
          longitude: -97.7431,
          provider: "ipapi.co (mock-fallback)",
          enriched: true,
        };
      }

      return {
        ip,
        country: "United States",
        country_code: "US",
        city: "San Francisco",
        region: "California",
        latitude: 37.7749,
        longitude: -122.4194,
        provider: "ip-api.com (local-dev)",
        enriched: true,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Provider A: ipstack (if key provided) or ip-api.com (free, no key)
    // ─────────────────────────────────────────────────────────────────────────
    if (!env.MOCK_GEO_PROVIDER_A_FAIL) {
      try {
        const result = await this.queryProviderA(ip);
        if (result && result.enriched) {
          return result;
        }
      } catch (err: any) {
        logger.warn(`[GeoService] Provider A failed for ${ip}: ${err.message}. Cascading to Provider B...`);
      }
    } else {
      logger.info(`[GeoService] Provider A mocked as DOWN. Cascading to Provider B...`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Provider B: ipapi.co (Fallback provider)
    // ─────────────────────────────────────────────────────────────────────────
    if (!env.MOCK_GEO_PROVIDER_B_FAIL) {
      try {
        const result = await this.queryProviderB(ip);
        if (result && result.enriched) {
          return result;
        }
      } catch (err: any) {
        logger.warn(`[GeoService] Provider B failed for ${ip}: ${err.message}. Graceful degradation triggered.`);
      }
    } else {
      logger.info(`[GeoService] Provider B mocked as DOWN. Graceful degradation triggered.`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Graceful Degradation: All providers failed, submission still succeeds
    // ─────────────────────────────────────────────────────────────────────────
    logger.warn(`[GeoService] All geo providers unavailable for ${ip}. Degrading safely without geo data.`);
    return {
      ip,
      enriched: false,
      provider: "none",
    };
  },

  /**
   * Provider A implementation (ipstack or ip-api.com)
   */
  async queryProviderA(ip: string): Promise<GeoLocationData | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      if (env.IPSTACK_API_KEY) {
        // Query ipstack API
        const url = `http://api.ipstack.com/${ip}?access_key=${env.IPSTACK_API_KEY}&format=1`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`ipstack HTTP ${res.status}`);
        const data = (await res.json()) as any;

        if (data && data.country_name) {
          return {
            ip,
            country: data.country_name,
            country_code: data.country_code,
            city: data.city || undefined,
            region: data.region_name || undefined,
            latitude: data.latitude,
            longitude: data.longitude,
            provider: "ipstack",
            enriched: true,
          };
        }
      } else {
        // Query ip-api.com JSON endpoint (free, no key)
        const url = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,lat,lon`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`ip-api HTTP ${res.status}`);
        const data = (await res.json()) as any;

        if (data && data.status === "success") {
          return {
            ip,
            country: data.country,
            country_code: data.countryCode,
            city: data.city,
            region: data.regionName,
            latitude: data.lat,
            longitude: data.lon,
            provider: "ip-api.com",
            enriched: true,
          };
        }
      }

      return null;
    } finally {
      clearTimeout(timeout);
    }
  },

  /**
   * Provider B implementation (ipapi.co fallback)
   */
  async queryProviderB(ip: string): Promise<GeoLocationData | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    try {
      const headers: Record<string, string> = {
        "User-Agent": "LeadCapture-GeoClient/1.0",
      };
      if (env.IPAPI_CO_KEY) {
        headers["Authorization"] = `Bearer ${env.IPAPI_CO_KEY}`;
      }

      const url = `https://ipapi.co/${ip}/json/`;
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) throw new Error(`ipapi.co HTTP ${res.status}`);
      const data = (await res.json()) as any;

      if (data && !data.error && (data.country_name || data.country)) {
        return {
          ip,
          country: data.country_name || data.country,
          country_code: data.country_code || data.country,
          city: data.city,
          region: data.region,
          latitude: data.latitude,
          longitude: data.longitude,
          provider: "ipapi.co",
          enriched: true,
        };
      }

      return null;
    } finally {
      clearTimeout(timeout);
    }
  },
};

export default geoService;
