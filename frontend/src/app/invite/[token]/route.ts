import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  // 招待トークンを使って参加ページにリダイレクト
  return NextResponse.redirect(new URL(`/rooms/join?token=${token}`, request.url));
} 