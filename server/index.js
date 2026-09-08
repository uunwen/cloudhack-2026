require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// app.use(
//   cors({
//     origin: ["http://localhost:5173", "https://cloudhack-2026-1.onrender.com"],
//   }),
// );

app.use(
  cors({
    origin: ["http://localhost:5173", "https://cloudhack-2026-2.onrender.com"],
  }),
);
// Extracted text is sent back for script, summary, and quiz generation. Keep that
// round trip intentionally bounded while allowing substantially more than Express's default.
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", require("./routes/parse"));
app.use("/api", require("./routes/generateScript"));
app.use("/api", require("./routes/generateAudio"));
app.use("/api", require("./routes/generateSummary"));
app.use("/api", require("./routes/generateQuiz"));
app.use("/api", require("./routes/chat"));
app.use("/api", require("./routes/transcribe"));
app.use("/api", require("./routes/chatSpeech"));

// Serve the built Vite frontend files
app.use(express.static(path.join(__dirname, "../client/dist")));

// Catch-all route to support frontend routing (like React Router)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
