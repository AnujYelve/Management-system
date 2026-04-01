export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db.js';
import Book from '@/models/Book.js';
import IssueRecord from '@/models/IssueRecord.js';
import User from '@/models/User.js';
import { authenticate } from '@/middleware/auth.js';

export async function GET(request) {
  try {
    const authResult = await authenticate(request, ['USER']);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const user = await User.findById(authResult.user._id).lean();
    const history = user?.readingHistory || [];

    // Cold start — return recent books
    if (history.length === 0) {
      const recent = await Book.find({ availableCopies: { $gt: 0 } })
        .populate('storeId', 'storeName city isOpenToday').sort({ createdAt: -1 }).limit(limit).lean();
      return NextResponse.json({
        recommendations: recent.map(({ embeddings, ...b }) => b),
        mode: 'cold-start', message: 'Issue some books to get personalised recommendations!',
      });
    }

    const sortedCats = [...history].sort((a, b) => b.count - a.count).map((h) => h.category);

    const activeIssues = await IssueRecord.find({
      userId: authResult.user._id, status: { $in: ['ISSUED', 'OVERDUE'] },
    }).select('bookId').lean();
    const issuedIds = activeIssues.map((r) => r.bookId.toString());

    const books = await Book.find({
      category: { $in: sortedCats }, availableCopies: { $gt: 0 }, _id: { $nin: issuedIds },
    }).populate('storeId', 'storeName city address isOpenToday').lean();

    const rank = {};
    sortedCats.forEach((c, i) => { rank[c] = sortedCats.length - i; });

    const results = books
      .map((b) => ({ ...b, _score: rank[b.category] || 0 }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ embeddings, _score, ...b }) => b);

    return NextResponse.json({
      recommendations: results, mode: 'personalized',
      topCategories: sortedCats.slice(0, 3), total: results.length,
    });
  } catch (error) {
    console.error('[Recommendations]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
