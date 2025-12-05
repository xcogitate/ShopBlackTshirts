import { NextResponse } from "next/server"

import { defaultCountdownSettings, defaultCouponSettings, getSiteSettings } from "@/lib/server/site-settings"

export async function GET() {
  try {
    const settings = await getSiteSettings()
    return NextResponse.json({
      countdown: settings.countdown ?? defaultCountdownSettings,
      coupon: settings.coupon ?? defaultCouponSettings,
    })
  } catch (error) {
    console.error("[/api/site-settings] failed to load settings", error)
    return NextResponse.json(
      { countdown: defaultCountdownSettings, coupon: defaultCouponSettings },
      { status: 200 },
    )
  }
}
