/**
 * Labinate monetization hook (paywall stub).
 *
 * Every app gates at least one feature behind requirePro(). The stub tracks
 * funnel events (paywall_shown, purchase_clicked) so we can measure intent
 * before wiring a real payment provider. Replacing the stub with Stripe /
 * RevenueCat later only touches this file.
 */

import { track } from "./analytics";

const PRO_KEY = "labinate_pro";

export function isPro(): boolean {
  return localStorage.getItem(PRO_KEY) === "1";
}

/**
 * Gate a feature. Returns true if the user may proceed.
 * Stub behavior: shows a native confirm dialog as the "paywall" and
 * unlocks for free on accept, while tracking the real funnel events.
 */
export function requirePro(feature: string): boolean {
  if (isPro()) return true;
  track("paywall_shown", { feature });
  const accepted = window.confirm(
    "This is a Pro feature.\n\n(Paywall stub — real checkout not wired yet. OK simulates a purchase.)",
  );
  if (accepted) {
    track("purchase_clicked", { feature });
    localStorage.setItem(PRO_KEY, "1");
    track("purchase_completed", { feature, provider: "stub" });
    return true;
  }
  track("paywall_dismissed", { feature });
  return false;
}
