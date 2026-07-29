// Main JS: populates posts and pages from JSON files in /assets
// Added simple Markdown rendering for Markdown-supported posts/pages.

document.addEventListener('DOMContentLoaded', function () {
  const postListEl = document.querySelector('[data-post-list]');
  if (postListEl) loadPosts(postListEl);
});

async function loadPosts(container) {
  try {
    const resp = await fetch('/assets/posts.json', {cache: 'no-cache'});
    if (!resp.ok) throw new Error('Posts not found');
    const posts = await resp.json();
    renderPostList(container, posts);
  } catch (err) {
    console.warn('Could not load posts.json:', err.message);
  }
}

function renderPostList(container, posts) {
  container.innerHTML = '';
  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';

    const a = document.createElement('a');
    a.className = 'title';
    a.textContent = post.title;
    if (post.path) a.href = post.path;
    else a.href = '/post.html?slug=' + encodeURIComponent(post.slug || slugify(post.title));
    a.setAttribute('aria-label', post.title);

    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = (post.date || '').toUpperCase();

    div.appendChild(a);
    div.appendChild(meta);
    container.appendChild(div);
  });
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

// --- Simple Markdown renderer ---
// Supports headings (#), bold **, italic *, links [text](url), lists, code blocks ```
function markdownToHtml(md) {
  if (!md) return '';
  // escape HTML first
  let out = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // code blocks ```
  out = out.replace(/```([\s\S]*?)```/g, function(_, code){
    return '<pre><code>' + code.replace(/&lt;/g,'&lt;') + '</code></pre>';
  });

  // inline code `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  // headings
  out = out.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  out = out.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  out = out.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  out = out.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  out = out.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // bold and italic
  out = out.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // links
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>');

  // unordered lists
  out = out.replace(/(^|\n)\s*[-\*] (.+)/g, function(_, pre, item){
    return pre + '<li>' + item + '</li>';
  });
  // wrap consecutive <li> into <ul>
  out = out.replace(/(<li>[\s\S]*?<\/li>)([\s\S]*?<li>[\s\S]*?<\/li>)+/g, function(match){
    const items = match.match(/<li>[\s\S]*?<\/li>/g).join('');
    return '<ul>' + items + '</ul>';
  });

  // paragraphs: split on two or more newlines
  out = out.replace(/(?:\r?\n){2,}/g, '\n\n');
  const blocks = out.split('\n\n');
  out = blocks.map(b => {
    if (/^<h\d>/.test(b) || /^<ul>/.test(b) || /^<pre>/.test(b) || /^<blockquote>/.test(b)) return b;
    return '<p>' + b.replace(/\n/g,'<br>') + '</p>';
  }).join('\n');

  return out;
}

function isMarkdownPost(obj){
  return obj && (obj.markdown === true || typeof obj.content_md === 'string');
}

function getPostHtml(post){
  if (isMarkdownPost(post)) {
    const md = post.content_md || post.content || post.excerpt || '';
    return markdownToHtml(md);
  }
  return post.content || ('<p>' + (post.excerpt || '') + '</p>');
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// post viewer helper (used by post.html)
window.renderPostBySlug = async function (slug, container) {
  try {
    const resp = await fetch('/assets/posts.json', {cache: 'no-cache'});
    if (!resp.ok) throw new Error('Posts not found');
    const posts = await resp.json();
    const post = posts.find(p => (p.slug || slugify(p.title)) === slug);
    if (!post) {
      container.innerHTML = '<p>Post not found.</p>';
      return;
    }
    const body = getPostHtml(post);
    container.innerHTML = `\n      <article class="post-article">\n        <h1>${escapeHtml(post.title)}</h1>\n        <p class="meta">${post.date || ''}</p>\n        <div class="post-body">${body}</div>\n      </article>\n    `;
  } catch (err) {
    container.innerHTML = '<p>Failed to load post.</p>';
    console.error(err);
  }
};

// page viewer helper (used by pages.html)
window.renderPageBySlug = async function (slug, container) {
  try {
    const resp = await fetch('/assets/pages.json', {cache: 'no-cache'});
    if (!resp.ok) throw new Error('Pages not found');
    const pages = await resp.json();
    const page = pages.find(p => p.slug === slug);
    if (!page) {
      container.innerHTML = '<p>Page not found.</p>';
      return;
    }
    const content = (page.markdown || typeof page.content_md === 'string') ? markdownToHtml(page.content_md || page.content) : (page.content || '');
    container.innerHTML = `\n      <article class="page-article">\n        <h1>${escapeHtml(page.title)}</h1>\n        <div class="page-body">${content}</div>\n      </article>\n    `;
  } catch (err) {
    container.innerHTML = '<p>Failed to load page.</p>';
    console.error(err);
  }
};
