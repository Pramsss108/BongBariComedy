fetch('https://html.duckduckgo.com/html?q=cobalt+public+instances+status')
  .then(r=>r.text())
  .then(t => {     
    console.log(t.substring(0, 3000));
  })