// No orphans: a block of copy never ends on a line with a single word. Browsers that know `text-wrap: pretty`
// (style.css) already do this at every width; for the rest, the last two words of each block are joined with a
// no-break space, now and whenever the copy changes (the home page swaps its lines as you travel).
const BLOCKS = "h1, h2, h3, p, li, dd, blockquote";

function glue(el) {
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let last = null;
  for (let n; (n = walk.nextNode()); ) if (n.data.trim()) last = n;
  if (!last) return;
  const m = last.data.match(/^([\s\S]*\S) (\S+\s*)$/); // the last ordinary space before the final word
  if (m) last.data = `${m[1]} ${m[2]}`;
}

export function noOrphans(root = document.body) {
  if (CSS.supports("text-wrap", "pretty")) return;
  const run = (node) => {
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!el) return;
    if (el.matches?.(BLOCKS)) glue(el);
    el.querySelectorAll?.(BLOCKS).forEach(glue);
    const block = el.closest?.(BLOCKS);
    if (block && block !== el) glue(block);
  };
  run(root);
  new MutationObserver((list) => list.forEach((r) => run(r.target))).observe(root, { childList: true, subtree: true, characterData: true });
}
