// Quote storage via GitHub — saves quotes.json directly to your repo
// Env vars needed: GITHUB_TOKEN, GITHUB_REPO (e.g. "username/reponame")

const TOKEN = process.env.GITHUB_TOKEN;
const REPO  = process.env.GITHUB_REPO;
const PASS  = process.env.QUOTES_PASSWORD || "alfastudio";
const FILE  = "quotes.json";
const BRANCH = "main";

async function ghGet() {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json" }
  });
  if (r.status === 404) return { content: null, sha: null };
  const d = await r.json();
  const content = JSON.parse(Buffer.from(d.content, "base64").toString("utf8"));
  return { content, sha: d.sha };
}

async function ghPut(data, sha) {
  const body = { message: "Update quotes", content: Buffer.from(JSON.stringify(data)).toString("base64"), branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return r.ok;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-password");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.headers["x-password"] !== PASS) return res.status(401).json({ error: "Unauthorized" });
  if (!TOKEN || !REPO) return res.status(503).json({ error: "Storage not configured" });

  try {
    if (req.method === "GET") {
      const { content } = await ghGet();
      return res.status(200).json(content || {});
    }
    if (req.method === "POST") {
      const { sha } = await ghGet();
      const ok = await ghPut(req.body, sha);
      return res.status(ok ? 200 : 500).json({ ok });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  res.status(405).json({ error: "Method not allowed" });
}
