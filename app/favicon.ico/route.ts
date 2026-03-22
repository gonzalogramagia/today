import { NextResponse } from "next/server";

export async function GET() {
  // Generate SVG with emoji 📝
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><text x='0' y='52' font-size='56'>📝</text></svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
