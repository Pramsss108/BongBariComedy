# Reaction Module (Prototype)

Steps:
1. Include:
   <link rel="stylesheet" href="reactions/reactionStyles.css" />
   <script defer src="reactions/reactionModule.js"></script>

2. Add to each post:
   <div class="bb-reactions" data-post-id="POST123"></div>

3. Optional: preload counts
   <script>
     // fetch('/api/reactions?ids=POST123').then(...).then(data => ReactionModule.importState(data));
   </script>

Features:
- Click to increment reactions
- Search existing reactions
- Add custom reaction (emoji + label)
- Copy share link
- Export/import in-memory state

To wire backend:
- Replace increment() with fetch PATCH
- On page load fetch counts then ReactionModule.importState(...)
