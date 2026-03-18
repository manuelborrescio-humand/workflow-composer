import { NextRequest, NextResponse } from "next/server";
import { fetchInstanceContext } from "@/lib/redash";

export async function GET(request: NextRequest) {
  const instanceId = request.nextUrl.searchParams.get("instanceId");

  if (!instanceId) {
    return NextResponse.json(
      { error: "instanceId is required" },
      { status: 400 }
    );
  }

  try {
    const context = await fetchInstanceContext(Number(instanceId));
    return NextResponse.json(context);
  } catch (error) {
    console.error("Redash fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch instance data" },
      { status: 500 }
    );
  }
}
