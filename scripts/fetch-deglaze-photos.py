# One-off (Nov 2026): saved each recipe's cover photo from its Deglaze share page into
# public/recipe-photos/ (720px JPEG) and pointed the batch files at it. Usage: python3 scripts/fetch-deglaze-photos.py . /tmp/x
import json, glob, re, sys, urllib.parse, urllib.request, io, os
from PIL import Image
root, tmp = sys.argv[1], sys.argv[2]
OWNER = 'YVBEEN7HWTerltmuMXFcj9ESPDW2'
def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (recipe-photo-export)'})
    with urllib.request.urlopen(req, timeout=30) as r: return r.read()
ok, fail = 0, []
for f in sorted(glob.glob(f'{root}/data/deglaze/batch-*.json')):
    recipes = json.load(open(f)); changed = False
    for r in recipes:
        if r.get('skip') or (r.get('photo') or '').startswith('/recipe-photos/'): continue
        try:
            html = get(f"https://web.deglaze.app/share/{OWNER}/{urllib.parse.quote(r['deglazeId'], safe='')}").decode('utf8', 'replace')
            m = re.search(r'property="og:image"\s+content="([^"]+)"', html) or re.search(r'content="([^"]+)"\s+property="og:image"', html)
            if not m: raise Exception('no og:image')
            img = Image.open(io.BytesIO(get(m.group(1).replace('&amp;', '&')))).convert('RGB')
            img.thumbnail((720, 720))
            out = f"{root}/public/recipe-photos/{r['id']}.jpg"
            img.save(out, 'JPEG', quality=78, optimize=True, progressive=True)
            r['photo'] = f"/recipe-photos/{r['id']}.jpg"; changed = True; ok += 1
            print('ok', r['id'], img.size, os.path.getsize(out)//1024, 'KB')
        except Exception as e:
            fail.append((r['id'], str(e)))
    if changed: open(f, 'w').write(json.dumps(recipes, indent=1, ensure_ascii=False) + '\n')
print('saved', ok, 'failed', fail)
