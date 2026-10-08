const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const posts = [
  {
    id: 1,
    author: "Sarah Johnson",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    time: "2 hours ago",
    text:
      "Enjoying a peaceful morning with coffee and a great view. Nothing beats a productive start to the day.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    likes: 1200,
    comments: 324,
    shares: 86,
  },
  {
    id: 2,
    author: "Alex Morgan",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
    time: "Yesterday",
    text:
      "Team meeting went great today. Proud of what we’ve built and excited for what’s next.",
    image: null,
    gallery: [
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80",
    ],
    likes: 842,
    comments: 210,
    shares: 54,
  },
];

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

app.get("/api/posts", (req, res) => {
  res.json(posts);
});

app.get("/api/posts/:id", (req, res) => {
  const post = posts.find((item) => item.id === Number(req.params.id));

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  return res.json(post);
});

app.use(express.static(path.join(__dirname)));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
