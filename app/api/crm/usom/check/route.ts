import { NextRequest, NextResponse } from "next/server";
import { isCrmAuthorized } from "@/lib/crm-auth";
import { getStorage } from "@/lib/storage";
import { runUsomCheck } from "@/lib/usom/run-check";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await getStorage();
    const result = await runUsomCheck(storage, "manual");
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "USOM kontrolü başarısız";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
