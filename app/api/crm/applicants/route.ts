import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { isCrmAuthorized } from "@/lib/crm-auth";

export async function GET(request: NextRequest) {
  try {
    if (!isCrmAuthorized(request.headers.get("authorization"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const storage = await getStorage();

    if (id) {
      const applicant = await storage.getApplicant(id);
      if (!applicant) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(applicant);
    }

    const applicants = await storage.listApplicants();
    return NextResponse.json(applicants);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Veri okunamadı";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
