export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import { generateChatResponse } from '@/lib/gemini.js';

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','have','has','do','does','will',
  'would','could','should','can','i','me','my','you','your','we','they',
  'what','which','who','this','that','and','or','but','not','any','all',
  'find','get','recommend','suggest','looking','want','need','books','book',
  'about','for','of','in','on','to','at','by','from','with','it','its','am',
]);

export async function POST(request) {
  try {
    const { message, conversationHistory = [] } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    await connectDB();

    // Extract keywords
    const keywords = message.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)).slice(0, 6);

    let relevantBooks = [];
    if (keywords.length > 0) {
      const orConditions = keywords.flatMap((kw) => [
        { title: { $regex: kw, $options: 'i' } },
        { author: { $regex: kw, $options: 'i' } },
        { category: { $regex: kw, $options: 'i' } },
        { description: { $regex: kw, $options: 'i' } },
      ]);
      relevantBooks = await Book.find({ $or: orConditions })
        .populate('storeId', 'storeName city isOpenToday').limit(6).lean();
    }

    let bookContext = '\n\n';
    if (relevantBooks.length > 0) {
      bookContext += 'Relevant books from our catalog:\n\n';
      bookContext += relevantBooks.map((b, i) => {
        const store = b.storeId;
        const avail = b.availableCopies > 0 ? `${b.availableCopies} copies available` : 'Currently unavailable';
        return `${i + 1}. "${b.title}" by ${b.author} | Category: ${b.category} | ${avail}${store ? ` at ${store.storeName}, ${store.city}` : ''}`;
      }).join('\n');
    } else {
      bookContext += '(No specific books matched this query in the current catalog.)';
    }

    const systemPrompt = `You are an AI Librarian for LibraryHub, a multi-store library management platform.
Help users find books, make recommendations, and answer questions about the library system.
Be helpful, concise, and enthusiastic. Keep responses under 300 words.${bookContext}`;

    const reply = await generateChatResponse(
      systemPrompt,
      message.trim(),
      conversationHistory
    );

    return NextResponse.json({
      reply,
      suggestedBooks: relevantBooks.map((b) => ({
        _id: b._id, title: b.title, author: b.author, category: b.category,
        availableCopies: b.availableCopies, bookImage: b.bookImage,
        store: b.storeId ? { storeName: b.storeId.storeName, city: b.storeId.city } : null,
      })),
    });
  } catch (error) {
    console.error('[Chat API]', error);

    // Gemini free-tier quota exceeded → return friendly message, not 500
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'The AI assistant is temporarily busy (rate limit reached). Please wait a moment and try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Failed to generate response.' }, { status: 500 });
  }
}
