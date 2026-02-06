export default function handler(_req: any, res: any) {
  res.statusCode = 410;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: "Deprecated" }));
}
