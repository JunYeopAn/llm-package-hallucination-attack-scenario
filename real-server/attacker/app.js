const express = require("express");
const app = express();

app.use(express.json({ limit: "1mb", type: "application/json" }));
app.use(express.text({ type: "*/*", limit: "1mb" }));

app.get("/test", (req, res) => {
  console.log("[ATTACKER] /test called");
  res.send("ok");
});

app.get("/", (req, res) => {
  res.send("attack-server: send me POST requests\n");
});

app.post("/", (req, res) => {
  console.log("=== [ATTACKER] Received exfiltrated data ===");

  if (typeof req.body === "object") {
    console.log(JSON.stringify(req.body, null, 2));
  } else {
    console.log(req.body);
  }

  console.log("=== [ATTACKER] End of data ===\n");

  res.status(200).send("OK");
});

const PORT = 8000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[ATTACKER] Listening on 0.0.0.0:${PORT}`);
});
