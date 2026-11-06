import { NextResponse } from 'next/server';
import { tripSchema } from '@/lib/validation';
import { demoPlan } from '@/lib/providers/demo';
import { livePlan, ProviderError } from '@/lib/providers/google';
import { rateLimit } from '@/lib/rate-limit';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    if (!(request.headers.get('content-type') ?? '').includes('application/json'))
      return NextResponse.json({ error: 'Send JSON trip details.' }, { status: 415, headers });
    const text = await request.text();
    if (text.length > 8192)
      return NextResponse.json({ error: 'Trip request is too large.' }, { status: 413, headers });
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400, headers });
    }
    const parsed = tripSchema.safeParse(input);
    if (!parsed.success)
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? 'Invalid trip',
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400, headers },
      );
    const trip = parsed.data;
    if (!(await rateLimit(request, `${trip.mode}-plan`, trip.mode === 'live' ? 6 : 30)))
      return NextResponse.json(
        { error: 'Too many searches. Please wait a minute.' },
        { status: 429, headers: { ...headers, 'Retry-After': '60' } },
      );
    const plan = trip.mode === 'demo' ? demoPlan(trip) : await livePlan(trip);
    return NextResponse.json(plan, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ProviderError
            ? error.message
            : 'Planning is temporarily unavailable. Please try demo mode or retry later.',
      },
      { status: error instanceof ProviderError ? error.status : 503, headers },
    );
  }
}
