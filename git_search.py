import json
import urllib.request
from urllib.error import HTTPError

def search_github(query):
    url = f"https://api.github.com/search/issues?q=repo:imputnet/cobalt+{urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for item in data.get('items', [])[:5]:
                print(f"#{item['number']}: {item['title']}\n{item['html_url']}\n")
    except HTTPError as e:
        print(f"Error {e.code}:\n{e.read().decode()}")

import urllib.parse
print("Searching for error.api.youtube.login...")
search_github('error.api.youtube.login')
print("Searching for youtube botguard bypass...")
search_github('youtube botguard bypass')
print("Searching for youtube login without cookies...")
search_github('youtube login without cookies')
