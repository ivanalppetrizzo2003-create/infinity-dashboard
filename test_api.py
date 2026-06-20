import urllib.request
import json
import time

endpoints = {
    "exa": {"query": "AI Agent"},
    "notion": {"query": "test"},
    "obsidian": {"query": "AI self-test entry"},
    "github": {"query": "torvalds/linux"},
    "browser": {"query": "https://example.com"},
    "fetch": {"query": "https://hnrss.org/frontpage"},
    "memory": {"query": "I am Antigravity testing the memory gem."}
}

print("Starting AI Self-Test for 7 Gems...\n")

for gem, payload in endpoints.items():
    req = urllib.request.Request(f"http://127.0.0.1:8000/api/{gem}", method="POST")
    req.add_header('Content-Type', 'application/json')
    try:
        data = json.dumps(payload).encode('utf-8')
        response = urllib.request.urlopen(req, data=data, timeout=10)
        resp_body = json.loads(response.read().decode('utf-8'))
        status = resp_body.get('status')
        msg = str(resp_body.get('data') or resp_body.get('message'))[:150]
        if status == 'success':
            print(f"[OK] {gem.upper()} -> SUCCESS -> {msg}")
        else:
            print(f"[FAIL] {gem.upper()} -> FAILED -> {msg}")
    except Exception as e:
        print(f"[ERROR] {gem.upper()} -> ERROR -> {str(e)}")
    time.sleep(0.5)

print("\nSelf-Test Complete.")
