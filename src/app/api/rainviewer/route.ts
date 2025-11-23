export async function GET() {
  const r = await fetch("https://api.rainviewer.com/public/weather-maps.json");
  return new Response(await r.text(), { headers: { "Content-Type": "application/json" } });
}
