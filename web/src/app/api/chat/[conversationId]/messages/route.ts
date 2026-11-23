import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConversation, getMessageReplyTarget, getProduct, listMessages, sendMessage } from '@/lib/db';
import { getVerifiedArtisanSession } from '@/lib/artisanAuth';

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ status: 'error' }, { status: 401 });
  if (session.role === 'artisan' && !await getVerifiedArtisanSession()) {
    return NextResponse.json({ status: 'error', message: 'Artisan verification is required to access messages.' }, { status: 403 });
  }
  const { conversationId } = await params;
  const conv = await getConversation(Number(conversationId));
  if (!conv) return NextResponse.json({ status: 'error', message: 'Conversation not found.' }, { status: 404 });

  const isParticipant =
    (session.role === 'customer' && conv.customer_id === session.id) ||
    (session.role === 'artisan' && conv.artisan_id === session.id) ||
    session.role === 'admin';
  if (!isParticipant) return NextResponse.json({ status: 'error', message: 'Not allowed.' }, { status: 403 });

  const messages = await listMessages(conv.id);
  return NextResponse.json({ status: 'success', messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'customer' && session.role !== 'artisan')) {
    return NextResponse.json({ status: 'error' }, { status: 401 });
  }
  if (session.role === 'artisan' && !await getVerifiedArtisanSession()) {
    return NextResponse.json({ status: 'error', message: 'Artisan verification is required to access messages.' }, { status: 403 });
  }
  const { conversationId } = await params;
  const conv = await getConversation(Number(conversationId));
  if (!conv) return NextResponse.json({ status: 'error', message: 'Conversation not found.' }, { status: 404 });

  const isParticipant =
    (session.role === 'customer' && conv.customer_id === session.id) ||
    (session.role === 'artisan' && conv.artisan_id === session.id);
  if (!isParticipant) return NextResponse.json({ status: 'error', message: 'Not allowed.' }, { status: 403 });

  const { message, product_id, reply_to_message_id } = (await req.json()) as {
    message?: string;
    product_id?: number;
    reply_to_message_id?: number;
  };
  const text = (message ?? '').trim();
  if (!text) return NextResponse.json({ status: 'error', message: 'Message is empty.' }, { status: 400 });

  if (reply_to_message_id !== undefined &&
    (!Number.isInteger(reply_to_message_id) || reply_to_message_id <= 0)) {
    return NextResponse.json({ status: 'error', message: 'Reply target is invalid.' }, { status: 400 });
  }
  if (reply_to_message_id !== undefined &&
    !await getMessageReplyTarget(conv.id, reply_to_message_id)) {
    return NextResponse.json({ status: 'error', message: 'The message you are replying to could not be found.' }, { status: 400 });
  }

  if (product_id != null) {
    const product = await getProduct(product_id);
    if (!product || product.artisan_id !== conv.artisan_id) {
      return NextResponse.json({ status: 'error', message: 'Product does not belong to this conversation.' }, { status: 400 });
    }
  }

  await sendMessage(conv.id, session.role, text, product_id, reply_to_message_id);
  return NextResponse.json({ status: 'success' });
}
