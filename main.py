from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from exa_py import Exa
from notion_client import Client as NotionClient
from github import Github
import sqlite3
import requests
from bs4 import BeautifulSoup
import os
from datetime import datetime

app = FastAPI(title="Infinity Dashboard")

# Mount static frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

# User Credentials
EXA_API_KEY = os.environ.get("EXA_API_KEY", "")
NOTION_API_KEY = os.environ.get("NOTION_API_KEY", "")
GITHUB_PAT = os.environ.get("GITHUB_PAT", "")
OBSIDIAN_PATH = r"C:\Users\tom\Documents\MyAgentVault"

# Client Instantiation
try: exa = Exa(EXA_API_KEY)
except: exa = None

try: notion = NotionClient(auth=NOTION_API_KEY)
except: notion = None

try: gh = Github(GITHUB_PAT)
except: gh = None

# Initialize local SQLite DB for "Memory" gem
os.makedirs("data", exist_ok=True)
db_path = "data/memory.db"
conn = sqlite3.connect(db_path, check_same_thread=False)
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, content TEXT, timestamp TEXT)")
conn.commit()


# ===================== GEM APIS =====================

@app.post("/api/exa")
async def run_exa(request: Request):
    data = await request.json()
    query = data.get("query", "")
    if not exa: return JSONResponse({"status": "error", "message": "Exa SDK not initialized."})
    try:
        response = exa.search_and_contents(query, type="auto", num_results=3, text=True)
        results = [{"title": r.title, "url": r.url, "text": r.text[:200] + "..." if r.text else ""} for r in response.results]
        return JSONResponse({"status": "success", "data": results})
    except Exception as e: return JSONResponse({"status": "error", "message": str(e)})

@app.post("/api/notion")
async def run_notion(request: Request):
    data = await request.json()
    query = data.get("query", "")
    if not notion: return JSONResponse({"status": "error", "message": "Notion SDK not initialized."})
    try:
        results = notion.search(query=query).get("results", [])
        titles = []
        for page in results[:5]:
            try: titles.append(page["properties"]["title"]["title"][0]["plain_text"])
            except: pass
        if not titles: titles = ["Connected, but no page titles found for query."]
        return JSONResponse({"status": "success", "data": [{"title": "Notion Query Result", "url": "#", "text": f"Found {len(results)} pages. Matches: {', '.join(titles)}"}]})
    except Exception as e: return JSONResponse({"status": "error", "message": str(e)})

@app.post("/api/obsidian")
async def run_obsidian(request: Request):
    data = await request.json()
    query = data.get("query", "")
    os.makedirs(OBSIDIAN_PATH, exist_ok=True)
    file_path = os.path.join(OBSIDIAN_PATH, "Infinity_Log.md")
    try:
        with open(file_path, "a", encoding="utf-8") as f:
            f.write(f"\n- [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {query}")
        return JSONResponse({"status": "success", "data": [{"title": "Note Appended", "url": file_path, "text": f"Successfully wrote '{query}' to local vault at {file_path}"}]})
    except Exception as e: return JSONResponse({"status": "error", "message": str(e)})

@app.post("/api/github")
async def run_github(request: Request):
    data = await request.json()
    query = data.get("query", "torvalds/linux")
    if not gh: return JSONResponse({"status": "error", "message": "GitHub SDK not initialized."})
    try:
        repo = gh.get_repo(query)
        commits = repo.get_commits()
        msg = commits[0].commit.message if commits.totalCount > 0 else "No commits"
        return JSONResponse({"status": "success", "data": [{"title": repo.full_name, "url": repo.html_url, "text": f"Latest commit: {msg}"}]})
    except Exception as e: return JSONResponse({"status": "error", "message": str(e)})

@app.post("/api/browser")
async def run_browser(request: Request):
    data = await request.json()
    url = data.get("query", "https://news.ycombinator.com")
    if not url.startswith("http"): url = "https://" + url
    try:
        r = requests.get(url, timeout=5)
        soup = BeautifulSoup(r.text, 'html.parser')
        title = soup.title.string if soup.title else "No Title Found"
        return JSONResponse({"status": "success", "data": [{"title": "Browser Fetch Success", "url": url, "text": f"Page Title: {title}\nSnippets: {r.text[:150]}"}]})
    except Exception as e: return JSONResponse({"status": "error", "message": str(e)})

@app.post("/api/fetch")
async def run_fetch(request: Request):
    data = await request.json()
    rss = data.get("query", "https://hnrss.org/frontpage")
    try:
        r = requests.get(rss, timeout=5)
        return JSONResponse({"status": "success", "data": [{"title": "RSS Fetch Data", "url": rss, "text": r.text[:250]}]})
    except Exception as e: return JSONResponse({"status": "error", "message": str(e)})

@app.post("/api/memory")
async def run_memory(request: Request):
    data = await request.json()
    query = data.get("query", "")
    try:
        if query:
            cursor.execute("INSERT INTO memories (content, timestamp) VALUES (?, ?)", (query, datetime.now().isoformat()))
            conn.commit()
            return JSONResponse({"status": "success", "data": [{"title": "Memory Stored", "url": db_path, "text": f"Saved fact: {query}"}]})
        else:
            cursor.execute("SELECT content FROM memories ORDER BY id DESC LIMIT 3")
            rows = cursor.fetchall()
            text = " | ".join([r[0] for r in rows])
            return JSONResponse({"status": "success", "data": [{"title": "Recent Memories", "url": db_path, "text": text}]})
    except Exception as e: return JSONResponse({"status": "error", "message": str(e)})

@app.post("/api/shutdown")
async def shutdown():
    import asyncio
    async def delayed_exit():
        await asyncio.sleep(0.5)
        os._exit(0)
    asyncio.create_task(delayed_exit())
    return JSONResponse({"status": "success", "message": "Server shutting down."})

@app.get("/")
def read_root():
    return RedirectResponse(url="/static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
