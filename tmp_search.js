const u = "https://html.duckduckgo.com/html/?q=site:github.com+%22https://api.cobalt.tools%22+OR+%22cobalt+api%22+%22instances%22";
fetch(u)
  .then(r => r.text())
  .then(h => {
    const urls = h.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[\w.-]*)*\/?/g) || [];
    const unique = [...new Set(urls.filter(x => x.includes('cobalt') || x.includes('api')))];
    console.log(unique);
  });
