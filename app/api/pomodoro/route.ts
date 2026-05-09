import { NextResponse } from "next/server";
import {
  recordPomodoroSession,
  listPomodoroSessions,
  getPomodoroStats,
} from "@/lib/db/pomodoro-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["focus", "short_break", "long_break"]);

export async function GET() {
  try {
    const [sessions, stats] = await Promise.all([
      listPomodoroSessions(20),
      getPomodoroStats(),
    ]);
    return NextResponse.json({ ok: true, sessions, stats });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!VALID_TYPES.has(body?.type)) {
      return NextResponse.json({ ok: false, error: "type inválido" }, { status: 400 });
    }
    if (!Number.isFinite(body?.duration_min) || body.duration_min <= 0) {
      return NextResponse.json({ ok: false, error: "duration_min inválido" }, { status: 400 });
    }
    const session = await recordPomodoroSession({
      type: body.type,
      duration_min: Math.round(body.duration_min),
      started_at: body.started_at,
      finished_at: body.finished_at,
      card_id: body.card_id ?? null,
      card_name: body.card_name ?? null,
      completed: body.completed !== false,
    });
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
