import { addReview, getReviews } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ reviews: await getReviews() });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const text = String(body.text || "").trim();
    const rating = Number(body.rating);
    const locale = String(body.locale || "").slice(0, 8);

    if (name.length < 2 || name.length > 80) {
      return Response.json({ error: "name" }, { status: 400 });
    }
    if (text.length < 12 || text.length > 800) {
      return Response.json({ error: "text" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "rating" }, { status: 400 });
    }

    const review = await addReview({ name, text, rating, locale });
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "fail" }, { status: 500 });
  }
}
