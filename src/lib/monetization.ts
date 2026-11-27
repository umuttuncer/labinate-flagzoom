/**
 * Labinate monetization hook (paywall stub — preview unlock).
 *
 * Every app gates at least one feature behind requirePro(). No payment
 * provider is wired yet, so the "paywall" is a native confirm() that unlocks
 * the feature for free on this device. It tracks honest events only:
 *   paywall_shown → paywall_stub_unlocked | paywall_dismissed
 * purchase_clicked / purchase_completed are reserved for a real provider
 * (Stripe / RevenueCat) so stub unlocks never inflate the purchase funnel.
 * Replacing the stub later only touches this file.
 *
 * NOT protection: isPro() is a localStorage flag anyone can set in devtools.
 * Never gate paid content with it — see README "Paywall (preview unlock)".
 */

import { track } from "./analytics";

const PRO_KEY = "labinate_pro";

export const PAYWALL_STUB_MESSAGE =
  "This is a Pro feature.\n\n" +
  "Preview unlock: purchases are not available yet, nothing is charged. " +
  "OK unlocks it for free on this device.";

export function isPro(): boolean {
  return localStorage.getItem(PRO_KEY) === "1";
}

/**
 * Gate a feature. Returns true if the user may proceed.
 * Stub behavior: shows a native confirm dialog as a preview unlock and
 * unlocks for free on accept.
 */
export function requirePro(feature: string): boolean {
  if (isPro()) return true;
  track("paywall_shown", { feature });
  const accepted = window.confirm(PAYWALL_STUB_MESSAGE);
  if (accepted) {
    localStorage.setItem(PRO_KEY, "1");
    track("paywall_stub_unlocked", { feature, provider: "stub" });
    return true;
  }
  track("paywall_dismissed", { feature });
  return false;
}
