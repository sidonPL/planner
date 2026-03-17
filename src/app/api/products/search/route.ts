import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchProducts } from "@/lib/openfoodfacts";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Zapytanie musi mieć co najmniej 2 znaki" },
        { status: 400 }
      );
    }

    const products = await searchProducts(query.trim(), page, pageSize);

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Błąd podczas wyszukiwania produktów" },
      { status: 500 }
    );
  }
}

