export function GET() {
  return Response.json({
    ok: true,
    versao: "5.5",
    timestamp: new Date().toISOString(),
  });
}
