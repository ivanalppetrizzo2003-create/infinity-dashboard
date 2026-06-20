import sqlite3
import os
import sys

def search_memory(keyword):
    db_path = os.path.join(os.path.dirname(__file__), "data", "memory.db")
    obsidian_path = r"C:\Users\tom\Documents\MyAgentVault\Infinity_Log.md"
    
    results = []
    
    # 1. 检索 SQLite 数据库
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT timestamp, content FROM memories WHERE content LIKE ? ORDER BY id DESC LIMIT 5", (f"%{keyword}%",))
            rows = cursor.fetchall()
            for r in rows:
                results.append(f"[数据库] ({r[0]}): {r[1]}")
            conn.close()
        except Exception as e:
            results.append(f"[DB Error]: {str(e)}")
        
    # 2. 检索 Obsidian Markdown 文件
    if os.path.exists(obsidian_path):
        try:
            with open(obsidian_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                for line in lines:
                    if keyword.lower() in line.lower():
                        results.append(f"[Obsidian 笔记]: {line.strip()}")
        except Exception as e:
            pass
            
    if not results:
        print(f"未找到关于 '{keyword}' 的记忆。")
    else:
        print("--- 唤醒的记忆片段 ---")
        for res in results[:10]: # 限制最多返回 10 条，保护 Token
            print(res)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        keyword = sys.argv[1]
        search_memory(keyword)
    else:
        print("请提供搜索关键词。")
