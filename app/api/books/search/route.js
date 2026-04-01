export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import { generateEmbedding, cosineSimilarity } from '@/lib/gemini.js';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const limit = parseInt(searchParams.get('limit') || '20');
    const storeId = searchParams.get('storeId');
    const category = searchParams.get('category');

    if (!query) return NextResponse.json({ error: 'q parameter is required' }, { status: 400 });

    const baseFilter = {};
    if (storeId) baseFilter.storeId = storeId;
    if (category) baseFilter.category = { $regex: category, $options: 'i' };

    // Try semantic search
    let queryEmbedding = null;
    try { queryEmbedding = await generateEmbedding(query); } catch { /* fallback */ }

    if (queryEmbedding) {
      const books = await Book.find({ ...baseFilter, embeddings: { $exists: true, $not: { $size: 0 } } })
        .populate('storeId', 'storeName city address isOpenToday').lean();

      if (books.length > 0) {
        const scored = books
          .map((b) => ({ ...b, _score: cosineSimilarity(queryEmbedding, b.embeddings) }))
          .sort((a, b) => b._score - a._score)
          .slice(0, limit)
          .map(({ _score, embeddings, ...b }) => ({ ...b, relevanceScore: Math.round(_score * 100) / 100 }));

        return NextResponse.json({ books: scored, mode: 'semantic', total: scored.length });
      }
    }

    // Fallback: regex
    const regex = { $regex: query, $options: 'i' };
    const books = await Book.find({
      ...baseFilter,
      $or: [{ title: regex }, { author: regex }, { category: regex }, { description: regex }, { ISBN: regex }],
    }).populate('storeId', 'storeName city address isOpenToday').limit(limit).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      books: books.map(({ embeddings, ...b }) => b),
      mode: 'regex', total: books.length,
    });
  } catch (error) {
    console.error('[Books Search]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
