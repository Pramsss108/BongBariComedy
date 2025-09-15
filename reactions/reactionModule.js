/* Reaction Module (frontend-only prototype)
   Usage:
     1. Include reactionStyles.css + this script.
     2. Add container: <div class="bb-reactions" data-post-id="POST123"></div>
     3. Call ReactionModule.initAll();
*/

const ReactionModule = (() => {
	// Default reaction set (id: {emoji,label})
	const DEFAULT_REACTIONS = [
		{id:"like", emoji:"👍", label:"Like"},
		{id:"laugh", emoji:"😂", label:"Laugh"},
		{id:"wow", emoji:"😲", label:"Wow"},
		{id:"clap", emoji:"👏", label:"Clap"},
		{id:"fire", emoji:"🔥", label:"Fire"},
		{id:"mind", emoji:"🧠", label:"Mind-Blown"}
	];

	// In-memory store: { postId: { reactionId: count, ... } }
	const store = {};

	function ensurePost(postId) {
		if(!store[postId]) {
			store[postId] = {};
			DEFAULT_REACTIONS.forEach(r => store[postId][r.id] = 0);
		}
	}

	function getReactions(postId) {
		ensurePost(postId);
		return store[postId];
	}

	function increment(postId, reactionId) {
		ensurePost(postId);
		if(store[postId][reactionId] == null) store[postId][reactionId] = 0;
		store[postId][reactionId]++;
	}

	function buildButton(postId, reaction, container) {
		const btn = document.createElement("button");
		btn.className = "bb-react-btn";
		btn.type = "button";
		btn.setAttribute("data-reaction-id", reaction.id);
		btn.setAttribute("aria-label", reaction.label);
		btn.innerHTML = `<span class="bb-emoji">${reaction.emoji}</span><span class="bb-count" data-count-for="${reaction.id}">${getReactions(postId)[reaction.id] || 0}</span>`;
		btn.addEventListener("click", () => {
			increment(postId, reaction.id);
			updateCounts(container, postId);
		});
		return btn;
	}

	function updateCounts(container, postId) {
		const counts = getReactions(postId);
		container.querySelectorAll(".bb-count").forEach(span => {
			const rid = span.getAttribute("data-count-for");
			span.textContent = counts[rid] ?? 0;
		});
	}

	function buildPalette(reactionSet, postId, container) {
		const wrap = document.createElement("div");
		wrap.className = "bb-reaction-bar";
		reactionSet.forEach(r => {
			wrap.appendChild(buildButton(postId, r, container));
		});
		return wrap;
	}

	function buildAddCustom(postId, container, reactionSet) {
		const customWrap = document.createElement("div");
		customWrap.className = "bb-add-custom";
		customWrap.innerHTML = `
			<input class="bb-search" type="text" placeholder="Search / Add (e.g. 🚀 Boost)" aria-label="Search reactions" />
			<div class="bb-search-results" hidden></div>
		`;
		const input = customWrap.querySelector(".bb-search");
		const results = customWrap.querySelector(".bb-search-results");

		function renderResults(q) {
			const qn = q.trim().toLowerCase();
			if(!qn) { results.hidden = true; results.innerHTML=""; return; }
			const filtered = reactionSet.filter(r => r.label.toLowerCase().includes(qn) || r.emoji.includes(qn));
			results.innerHTML = "";
			filtered.forEach(r => {
				const item = document.createElement("button");
				item.type="button";
				item.className="bb-result";
				item.textContent = `${r.emoji} ${r.label}`;
				item.addEventListener("click", () => {
					increment(postId, r.id);
					updateCounts(container, postId);
					results.hidden = true;
					input.value = "";
				});
				results.appendChild(item);
			});
			// Offer to add custom if not matched and pattern includes emoji + text
			if(!filtered.length) {
				const m = q.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s+(.+)/u);
				if(m) {
					const emoji = m[1];
					const label = m[2].substring(0,30);
					const addBtn = document.createElement("button");
					addBtn.type="button";
					addBtn.className="bb-result bb-add";
					addBtn.textContent = `Add ${emoji} ${label}`;
					addBtn.addEventListener("click", () => {
						const id = ("c_" + label.toLowerCase().replace(/\s+/g,"_") + "_" + Date.now()).slice(0,40);
						reactionSet.push({id, emoji, label});
						store[postId][id] = 0;
						const bar = container.querySelector(".bb-reaction-bar");
						bar.appendChild(buildButton(postId, {id, emoji, label}, container));
						results.hidden = true;
						input.value = "";
					});
					results.appendChild(addBtn);
				}
			}
			results.hidden = false;
		}

		input.addEventListener("input", e => renderResults(e.target.value));
		input.addEventListener("keydown", e => {
			if(e.key === "Escape") { results.hidden = true; }
		});
		return customWrap;
	}

	function buildShare(postId) {
		const div = document.createElement("div");
		div.className = "bb-share";
		div.innerHTML = `<button type="button" class="bb-share-btn" aria-label="Copy share link">🔗 Share</button><span class="bb-share-status" aria-live="polite"></span>`;
		const btn = div.querySelector(".bb-share-btn");
		const status = div.querySelector(".bb-share-status");
		btn.addEventListener("click", async () => {
			const link = `${location.origin}${location.pathname}?post=${encodeURIComponent(postId)}`;
			try {
				await navigator.clipboard.writeText(link);
				status.textContent = "Link copied";
				setTimeout(()=> status.textContent="", 2000);
			} catch {
				status.textContent = link;
			}
		});
		return div;
	}

	function init(container) {
		const postId = container.getAttribute("data-post-id");
		if(!postId) return;
		ensurePost(postId);
		const reactionSet = [...DEFAULT_REACTIONS]; // local copy (extensible)
		container.classList.add("bb-ready");
		const palette = buildPalette(reactionSet, postId, container);
		const custom = buildAddCustom(postId, container, reactionSet);
		const share = buildShare(postId);
		container.appendChild(palette);
		container.appendChild(custom);
		container.appendChild(share);
	}

	function initAll(root = document) {
		root.querySelectorAll(".bb-reactions:not(.bb-ready)").forEach(init);
	}

	// Public API (can later wire to backend)
	return {
		initAll,
		exportState: () => JSON.parse(JSON.stringify(store)),
		importState: (data) => { Object.assign(store, data); },
		addReactionTypeGlobally: (id, emoji, label) => {
			if(!DEFAULT_REACTIONS.find(r => r.id === id))
				DEFAULT_REACTIONS.push({id, emoji, label});
		}
	};
})();

// Auto-init on DOM ready
document.addEventListener("DOMContentLoaded", () => ReactionModule.initAll());
