export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", "vn");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  const r = await fetch(url.toString(), { headers: { "User-Agent": "floodmap/1.0" } });
  return new Response(await r.text(), { headers: { "Content-Type": "application/json" } });
}
