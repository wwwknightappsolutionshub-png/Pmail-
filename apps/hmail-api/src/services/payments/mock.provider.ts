import { getEnv } from "../../config/env.js";

export function createMockCheckoutUrl(checkoutId: string): string {
  const env = getEnv();
  return `${env.HOSTNET_WEB_URL}/checkout/mock?checkoutId=${checkoutId}`;
}
