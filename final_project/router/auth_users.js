const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

// Helper function to validate user
const isValid = (username) => {
  return users.some(user => user.username === username);
};

// Helper function to check username and password
const authenticatedUser = (username, password) => {
  return users.some(user => user.username === username && user.password === password);
};

// Middleware for JWT Authentication
const authenticateJWT = (req, res, next) => {
  const token = req.session.authorization?.accessToken;

  if (!token) {
    return res.status(403).json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, "access", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    req.user = user;
    next();
  });
};

// Registered users can login
regd_users.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and Password are required" });
  }

  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Generate JWT access token
    let accessToken = jwt.sign({ username: username }, 'access', { expiresIn: '1h' });

    // Store the access token in session
    req.session.authorization = {
      accessToken
    };

    return res.status(200).json({ message: "User successfully logged in", accessToken });
  } else {
    return res.status(401).json({ message: "Invalid username or password" });
  }
});

// Add or modify a book review
regd_users.put("/review/:isbn", authenticateJWT, (req, res) => {
  const isbn = req.params.isbn;
  const review = req.body.review;
  const username = req.user.username;

  if (!review) {
    return res.status(400).json({ message: "Review text is required" });
  }

  if (!books[isbn]) {
    return res.status(404).json({ message: "Book not found" });
  }

  if (!books[isbn].reviews) {
    books[isbn].reviews = {};
  }

  // Update the review for the given ISBN and username
  books[isbn].reviews[username] = review;

  return res.status(200).json({ message: "Review added/modified successfully", reviews: books[isbn].reviews });
});

// Delete a book review
regd_users.delete("/review/:isbn", authenticateJWT, (req, res) => {
  const isbn = req.params.isbn;
  const username = req.user.username;

  if (!books[isbn] || !books[isbn].reviews || !books[isbn].reviews[username]) {
    return res.status(404).json({ message: "Review not found" });
  }

  // Delete the user's review
  delete books[isbn].reviews[username];

  return res.status(200).json({ message: "Review deleted successfully", reviews: books[isbn].reviews });
});

module.exports = regd_users;
module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
