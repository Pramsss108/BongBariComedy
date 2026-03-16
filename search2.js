fetch('https://html.duckduckgo.com/html?q=cobalt+public+instances+list+status+%22url%22')
  .then(r=>r.text())
  .then(t => { 
    const links = [...t.matchAll(/class="result__url"[^>]*>([^<]+)/g)].map(m => m[1].trim()); 
    console.log(links) 
  })