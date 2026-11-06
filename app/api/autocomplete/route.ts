import { NextResponse } from 'next/server';
import { autocomplete, ProviderError } from '@/lib/providers/google';
import { rateLimit } from '@/lib/rate-limit';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    if (!(await rateLimit(request, 'autocomplete', 30)))
      return NextResponse.json(
        { error: 'Please wait before searching again.' },
        { status: 429, headers },
      );
    const text = await request.text();
    if (text.length > 1024)
      return NextResponse.json({ error: 'Input too long' }, { status: 413, headers });
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers });
    }
    const b = body as { input?: unknown; country?: unknown };
    if (
      !b ||
      typeof b.input !== 'string' ||
      b.input.length < 3 ||
      b.input.length > 200 ||
      typeof b.country !== 'string' ||
      !/^[A-Z]{2}$/.test(b.country)
    )
      return NextResponse.json({ suggestions: [] }, { headers });
    return NextResponse.json({ suggestions: await autocomplete(b.input) }, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ProviderError
            ? error.message
            : 'Suggestions unavailable. Enter the full address manually.',
      },
      { status: 503, headers },
    );
  }
}
