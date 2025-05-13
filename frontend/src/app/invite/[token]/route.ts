import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // TODO: サーバーサイドでトークンの有効性を検証し、関連するセッションIDを取得するロジックを追加
  // const session = await verifyInviteTokenAndGetSession(token);
  // if (!session) {
  //   return NextResponse.redirect(new URL('/invalid-invite', request.url));
  // }

  // 有効なトークンであれば、セッション参加ページにリダイレクト（/sessions/:id/join?token=... のような形式が良いかもしれない）
  // 現状はトークンをクエリパラメータとしてセッション一覧に渡しているが、直接参加ページへ誘導すべき
  // return NextResponse.redirect(new URL(`/sessions/${session.id}/join?token=${token}`, request.url)); 

  // ★★★ 修正: /rooms/join -> /sessions/join (または適切な参加パス)
  // 一旦、`/sessions` にリダイレクトし、参加処理はクライアントサイドで行う形にするか？
  // または、バックエンドに /api/sessions/join/:token のようなエンドポイントを作り、そこで認証と参加処理を行う？
  // 現状の実装に合わせて、一旦 /sessions に飛ばすことにする。
  // return NextResponse.redirect(new URL(`/rooms/join?token=${token}`, request.url));
  return NextResponse.redirect(new URL(`/sessions?inviteToken=${token}`, request.url)); // /sessions へリダイレクトし、クエリでトークンを渡す
} 