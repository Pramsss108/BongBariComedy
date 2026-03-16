const instances = [
  "https://api.cobalt.tools",
  "https://cobalt-api.kwiatekmiki.com",
  "https://cobalt.kwiatekmiki.com",
  "https://cobalt.101010.top",
  "https://cobalt-api.pepegd.dev",
  "https://cobalt.pepegd.dev",
  "https://co.nn.ci",
  "https://cobalt.qewertyy.dev",
  "https://cobalt-api.qewertyy.dev",
  "https://cobalt.wago.ovh", 
  "https://cobalt.owo.network",
  "https://api.cobalt.owo.network",
  "https://api.cobalt.wuk.sh"
];

async function checkInstances() {
  const working = [];
  for (const url of instances) {
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' }});
      if (res.ok) {
        const data = await res.json();
        if (data.cobalt && data.cobalt.version) {
          working.push({ url, version: data.cobalt.version });
        }
      }
    } catch(e) {}
  }
  console.log("Found instances:", working);
}
checkInstances();