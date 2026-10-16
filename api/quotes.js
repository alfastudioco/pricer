// Quote storage via GitHub — saves quotes.json directly to your repo
// Env vars needed: GITHUB_TOKEN, GITHUB_REPO (e.g. "username/reponame"),
// optional AI_PASSWORD (the app password, shared with /api/claude; when unset the route is open)
import { timingSafeEqual } from "crypto";

const TOKEN = process.env.GITHUB_TOKEN;
const REPO  = process.env.GITHUB_REPO;
const FILE  = "quotes.json";
const BRANCH = "main";

const passwordOk = (given) => {
  const expected = process.env.AI_PASSWORD;
  if (!expected) return true;
  if (typeof given !== "string") return false;
  const a = Buffer.from(given), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

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
  if (!passwordOk(req.headers["x-password"])) return res.status(401).json({ error: "Unauthorized" });
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
