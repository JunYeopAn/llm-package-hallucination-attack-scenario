import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const PORT = process.env.PORT || 5000;

async function createDb() {
  const db = await open({
    filename: "./users.db",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );
  `);

  return db;
}

const app = express();
app.use(express.json());

let dbPromise = createDb();

// 회원가입
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username, password 필요" });
  }

  try {
    const db = await dbPromise;
    await db.run("INSERT INTO users (username, password) VALUES (?, ?)", [
      username,
      password, // 실제 서비스면 bcrypt 등으로 해시해야 함
    ]);
    console.log("[VICTIM] New user registered:", username);
    return res.json({ message: "register ok" });
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ message: "이미 존재하는 username" });
    }
    console.error(err);
    return res.status(500).json({ message: "internal error" });
  }
});

// 로그인
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username, password 필요" });
  }

  try {
    const db = await dbPromise;
    const user = await db.get(
      "SELECT * FROM users WHERE username = ? AND password = ?",
      [username, password]
    );
    if (!user) {
      return res.status(401).json({ message: "login failed" });
    }

    console.log("[VICTIM] User logged in:", username);
    return res.json({ message: "login ok" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "internal error" });
  }
});

// 상태 확인용
app.get("/", (req, res) => {
  res.send("victim server running");
});

app.listen(PORT, () => {
  console.log(`[VICTIM] Listening on port ${PORT}`);
});
