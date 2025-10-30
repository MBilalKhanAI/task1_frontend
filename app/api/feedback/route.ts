export const dynamic = 'force-dynamic';

const BACKEND_BASE = process.env.BACKEND_BASE_URL || 'https://backend-9kol.onrender.com';

export async function POST(request: Request): Promise<Response> {
  try {
    const requestBody = await request.json();

    const upstreamResponse = await fetch(`${BACKEND_BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const responseText = await upstreamResponse.text();

    return new Response(responseText, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to reach backend service' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}


