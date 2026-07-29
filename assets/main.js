// Main JS: populates posts and pages from JSON files in /assets
// Usage:
// - Add posts to /assets/posts.json (array of {title,slug,date,excerpt,content (optional),path(optional)})
// - Add pages to /assets/pages.json (array of {slug,title,content})
// - post.html is a simple template that reads ?slug=...

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
    // silently fail and leave static content
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
    // prefer explicit path, otherwise link to post.html?slug=slug
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
    container.innerHTML = `
      <article class="post-article">
        <h1>${escapeHtml(post.title)}</h1>
        <p class="meta">${post.date || ''}</p>
        <div class="post-body">${post.content || ('<p>' + (post.excerpt || '') + '</p>')}</div>
      </article>
    `;
  } catch (err) {
    container.innerHTML = '<p>Failed to load post.</p>';
    console.error(err);
  }
};

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
