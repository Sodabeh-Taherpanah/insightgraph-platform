import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    message: 'InsightGraph API gateway is running',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api
 * Echo endpoint for testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      received: body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
