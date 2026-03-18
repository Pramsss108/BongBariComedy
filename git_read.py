import json
import urllib.request
import urllib.parse
from urllib.error import HTTPError

def get_issue(number):
    url = f"https://api.github.com/repos/imputnet/cobalt/issues/{number}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"--- ISSUE {number}: {data['title']} ---")
            print(data['body'])
            print("\n--- COMMENTS ---")
    except:
        pass
        
    url = f"https://api.github.com/repos/imputnet/cobalt/issues/{number}/comments"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            for c in data:
                print(f"[{c['user']['login']}]: {c['body']}\n")
    except:
        pass

for n in [1189, 898, 1258, 1233]:
    get_issue(n)
