import { NextRequest, NextResponse } from "next/server";
import { sendAllHouseholdReports } from "@/lib/reports";
import { verifyCronAuth } from "@/lib/web-push";


export async function GET(request: NextRequest) {
  try {
    // Weryfikacja tokena cron (zabezpieczenie przed nieautoryzowanym dostępem)
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    // Sprawdź czy to pierwszy dzień miesiąca
    const now = new Date();
    const dayOfMonth = now.getDate();

    if (dayOfMonth === 1) {
      // Pierwszy dzień miesiąca - wyślij raporty miesięczne
      const results = await sendAllHouseholdReports("monthly");

      console.log("[Cron] Monthly reports sent:", results);

      return NextResponse.json({
        success: true,
        type: "monthly",
        results,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Not a report day (monthly reports on 1st of month)",
    });
  } catch (error) {
    console.error("[Cron] Error sending monthly reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

