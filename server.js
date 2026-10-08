const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "database.sqlite");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite DB:", err.message);
    process.exit(1);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      avatar TEXT,
      time TEXT,
      text TEXT NOT NULL,
      image TEXT,
      gallery TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0
    )
  `, (createErr) => {
    if (createErr) {
      console.error("Failed to initialize posts table:", createErr.message);
      process.exit(1);
    }

    db.get(`SELECT COUNT(*) AS count FROM posts`, (countErr, row) => {
      if (!countErr && row.count === 0) {
        const seedPosts = [
          {
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
            author: "Alex Morgan",
            avatar:
              "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
            time: "Yesterday",
            text:
              "Team meeting went great today. Proud of what we’ve built and excited for what’s next.",
            image: null,
            gallery: JSON.stringify([
              "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=700&q=80",
              "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80",
            ]),
            likes: 842,
            comments: 210,
            shares: 54,
          },
        ];

        seedPosts.forEach((post) => {
          db.run(
            `INSERT INTO posts (author, avatar, time, text, image, gallery, likes, comments, shares)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              post.author,
              post.avatar,
              post.time,
              post.text,
              post.image,
              post.gallery || null,
              post.likes,
              post.comments,
              post.shares,
            ]
          );
        });
      }
    });
  });
});

app.use(express.json());

const normalizePost = (post) => ({
  ...post,
  gallery: post.gallery ? JSON.parse(post.gallery) : null,
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

app.get("/api/posts", (req, res) => {
  db.all(`SELECT * FROM posts ORDER BY id DESC`, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch posts" });
    }

    return res.json(rows.map(normalizePost));
  });
});

app.get("/api/posts/:id", (req, res) => {
  const id = Number(req.params.id);

  db.get(`SELECT * FROM posts WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch post" });
    }

    if (!row) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.json(normalizePost(row));
  });
});

app.post("/api/posts", (req, res) => {
  const { author, text, image, likes, comments, shares } = req.body;

  if (!author || !text) {
    return res.status(400).json({ message: "Author and text are required" });
  }

  const post = {
    author,
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    time: "Just now",
    text,
    image: image || null,
    gallery: null,
    likes: Number(likes) || 0,
    comments: Number(comments) || 0,
    shares: Number(shares) || 0,
  };

  db.run(
    `INSERT INTO posts (author, avatar, time, text, image, gallery, likes, comments, shares)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      post.author,
      post.avatar,
      post.time,
      post.text,
      post.image,
      post.gallery,
      post.likes,
      post.comments,
      post.shares,
    ],
    function (insertErr) {
      if (insertErr) {
        return res.status(500).json({ message: "Failed to create post" });
      }

      db.get(`SELECT * FROM posts WHERE id = ?`, [this.lastID], (readErr, createdRow) => {
        if (readErr || !createdRow) {
          return res.status(500).json({ message: "Post created but could not be read back" });
        }

        return res.status(201).json(normalizePost(createdRow));
      });
    }
  );
});

app.put("/api/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  const { author, text, image, likes, comments, shares } = req.body;

  db.get(`SELECT * FROM posts WHERE id = ?`, [id], (findErr, existingPost) => {
    if (findErr) {
      return res.status(500).json({ message: "Failed to find post" });
    }

    if (!existingPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const updatedValues = {
      author: author || existingPost.author,
      text: text || existingPost.text,
      image: image !== undefined ? image : existingPost.image,
      likes: likes !== undefined ? Number(likes) : existingPost.likes,
      comments: comments !== undefined ? Number(comments) : existingPost.comments,
      shares: shares !== undefined ? Number(shares) : existingPost.shares,
    };

    db.run(
      `UPDATE posts SET author = ?, text = ?, image = ?, likes = ?, comments = ?, shares = ? WHERE id = ?`,
      [
        updatedValues.author,
        updatedValues.text,
        updatedValues.image,
        updatedValues.likes,
        updatedValues.comments,
        updatedValues.shares,
        id,
      ],
      (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ message: "Failed to update post" });
        }

        db.get(`SELECT * FROM posts WHERE id = ?`, [id], (readErr, updatedRow) => {
          if (readErr || !updatedRow) {
            return res.status(500).json({ message: "Post updated but could not be read back" });
          }

          return res.json(normalizePost(updatedRow));
        });
      }
    );
  });
});

app.delete("/api/posts/:id", (req, res) => {
  const id = Number(req.params.id);

  db.run(`DELETE FROM posts WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).json({ message: "Failed to delete post" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.json({ message: "Post deleted successfully" });
  });
});

app.use(express.static(path.join(__dirname)));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
