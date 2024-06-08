// src/index.js
const { marked } = require('marked');

// Ví dụ sử dụng marked để chuyển đổi Markdown thành HTML
const markdownString = '# Hello, world!';
const htmlString = marked(markdownString);
console.log(htmlString);
