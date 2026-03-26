import re
with open('client/src/pages/SocialDownloaderPage.tsx', 'r', encoding='utf-8') as f:
    t = f.read()

state_old = 'const [url, setUrl] = useState("");\n  const [forceEngine, setForceEngine] = useState<string>("auto");'
state_new = 'const [url, setUrl] = useState("");\n  const isYouTubeUrl = url.includes("youtube.com") or url.includes("youtu.be");\n  const isMetaUrl = url.includes("instagram.com") or url.includes("facebook.com") or url.includes("fb.watch");\n  const [forceEngine, setForceEngine] = useState<string>("auto");'.replace('or', '||')

t = t.replace(state_old, state_new)

idx1 = t.find('{/* Developer Engine Override */}')
idx2 = t.find('{/* 2. STATUS / ERROR', idx1)

if idx1 != -1 and idx2 != -1:
    with open('new_dropdown.txt', 'r', encoding='utf-8') as drop:
        dropdown_html = drop.read()
    
    t = t[:idx1] + dropdown_html + t[idx2-18:]
    with open('client/src/pages/SocialDownloaderPage.tsx', 'w', encoding='utf-8') as f:
        f.write(t)
    print('Cleanly replaced!')
else:
    print('Failed to find markers')
