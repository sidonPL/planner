import { NextRequest, NextResponse } from "next/server";
import { sendAllHouseholdReports } from "@/lib/reports";

export async function GET(request: NextRequest) {
  try {
    // Weryfikacja tokena cron (zabezpieczenie przed nieautoryzowanym dostępem)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sprawdź dzień tygodnia - raporty tygodniowe wysyłamy w poniedziałek
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = niedziela, 1 = poniedziałek

    if (dayOfWeek === 1) {
      // Poniedziałek - wyślij raporty tygodniowe
      const results = await sendAllHouseholdReports("weekly");

      console.log("[Cron] Weekly reports sent:", results);

      return NextResponse.json({
        success: true,
        type: "weekly",
        results,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Not a report day (weekly reports on Monday)",
    });
  } catch (error) {
    console.error("[Cron] Error sending weekly reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

