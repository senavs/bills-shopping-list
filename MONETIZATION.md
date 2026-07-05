# Monetization - Google AdSense Setup Guide

This document describes how to activate Google AdSense ads in BillBuddy.

## Current State

The ad infrastructure is already integrated into the app:
- **Desktop browser (xl+ screens):** Two vertical banners (160×600) on the left and right sides
- **Mobile / PWA standalone:** A horizontal bottom banner (full-width, 60px tall)
- **Landing page:** Ad-free (no ads on first impression)

Until AdSense is configured, all ad placements show a dashed-border placeholder with "Ad Space" text so you can visualize the layout.

## Prerequisites

- You must be at least 18 years old
- Your site must have original content and comply with [Google Publisher Policies](https://support.google.com/adsense/answer/10502938)
- A Privacy Policy page is strongly recommended (Google may require it)

## Step-by-Step Setup

### 1. Sign Up for Google AdSense

1. Go to [https://adsense.google.com](https://adsense.google.com)
2. Sign in with your Google account
3. Add your site URL: `https://senavs.github.io/bills-shopping-list/`
4. Complete your payment information and profile

### 2. Site Verification

Google will provide a verification code. This is already handled by the AdSense script tag in `index.html`.

1. Open `index.html`
2. Find the commented-out AdSense script tag
3. Replace `ca-pub-XXXXXXXXXXXXXXXX` with your real publisher ID
4. Uncomment the `<script>` tag:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_REAL_ID" crossorigin="anonymous"></script>
```

5. Deploy the site (`npm run deploy`)

### 3. Set Up ads.txt

Google requires an `ads.txt` file at the **root domain**. Since the app is hosted at `senavs.github.io/bills-shopping-list/`, the `ads.txt` must be at `senavs.github.io/ads.txt`.

1. Create a repository named `senavs.github.io` (if it doesn't exist)
2. Add a file named `ads.txt` at the root with this content:

```
google.com, pub-YOUR_PUBLISHER_ID, DIRECT, f08c47fec0942fa0
```

3. Replace `pub-YOUR_PUBLISHER_ID` with your actual publisher ID
4. Push to GitHub and verify it's accessible at `https://senavs.github.io/ads.txt`

### 4. Create Ad Units

In your AdSense dashboard, go to **Ads → By ad unit → Display ads**:

1. **Side banners (desktop):** Create a "Display ad" unit
   - Name: `BillBuddy Side Banner`
   - Size: Fixed size → 160×600 (Wide Skyscraper)
   - Note the **ad slot ID** (a number like `1234567890`)

2. **Bottom banner (mobile):** Create a "Display ad" unit
   - Name: `BillBuddy Bottom Banner`
   - Size: Fixed size → 728×90 (Leaderboard) or Responsive
   - Note the **ad slot ID**

### 5. Update the App Configuration

Open `src/components/ads/adsConfig.ts` and fill in your IDs:

```typescript
export const AD_CLIENT = 'ca-pub-YOUR_PUBLISHER_ID'

export const AD_SLOTS = {
  sideLeft: 'YOUR_SIDE_LEFT_SLOT_ID',
  sideRight: 'YOUR_SIDE_RIGHT_SLOT_ID',  // can be same as sideLeft
  bottom: 'YOUR_BOTTOM_SLOT_ID',
}
```

### 6. Deploy and Wait for Approval

```bash
npm run deploy
```

Google will review your site. This can take **a few days to 2-4 weeks**. During this time:
- The AdSense script will load but no ads will display
- The placeholders will remain visible until `AD_CLIENT` is set
- Once approved, ads will automatically start appearing

## How It Works

| Condition | What's Displayed |
|-----------|-----------------|
| `AD_CLIENT` is empty | Placeholder (dashed border + "Ad Space") |
| `AD_CLIENT` is set + user is offline | Placeholder |
| `AD_CLIENT` is set + user is online | Real Google Ad |

The transition from placeholder to real ads is automatic — once you fill in the config and deploy, real ads replace placeholders for online users.

## Ad Placement Details

### Desktop (browser, xl+ screens ≥ 1280px)
```
┌──────┬────────────────────────┬──────┐
│ 160px│    App Content          │160px │
│      │    (max-w-4xl)          │      │
│ LEFT │                         │RIGHT │
│ SIDE │                         │ SIDE │
│BANNER│                         │BANNER│
│      │                         │      │
│ 600px│                         │600px │
└──────┴────────────────────────┴──────┘
```

### Mobile / PWA Standalone (or < 1280px)
```
┌─────────────────────────────────────┐
│                                     │
│         App Content                 │
│                                     │
│                                     │
├─────────────────────────────────────┤
│        BOTTOM BANNER (60px)         │
└─────────────────────────────────────┘
```

## Files Modified for Monetization

| File | Purpose |
|------|---------|
| `src/components/ads/adsConfig.ts` | AdSense publisher ID and slot IDs |
| `src/components/ads/AdBanner.tsx` | Reusable ad component with placeholder fallback |
| `src/components/ads/AdLayout.tsx` | Layout wrapper positioning ads around content |
| `src/hooks/useOnlineStatus.ts` | Network connectivity detection |
| `src/hooks/useDisplayMode.ts` | PWA standalone vs browser detection |
| `src/App.tsx` | Wraps app routes with AdLayout |
| `index.html` | AdSense script tag (commented out) |
| `src/vite-env.d.ts` | TypeScript declarations for adsbygoogle |

## Revenue Expectations

For a utility/tool PWA with modest traffic, expect:
- **CPC (Cost Per Click):** $0.05–$0.30 for general/finance niche
- **RPM (Revenue Per 1000 Impressions):** $1–$5
- Revenue scales directly with active users and page views

## Troubleshooting

- **Ads not showing after approval:** Check browser console for AdSense errors. Verify `AD_CLIENT` and `AD_SLOTS` are correct.
- **Ad blockers:** Many users have ad blockers. The component handles this gracefully — the ad space just stays empty (no errors).
- **PWA offline:** Ads require network. The placeholder shows when offline.
- **ads.txt warnings:** Ensure the file is at `https://senavs.github.io/ads.txt` (root domain, not the sub-path).
