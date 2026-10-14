#!/usr/bin/env python3
"""
SmeltIQ Automated GitHub Publisher
Creates the repository 'SmeltIQ' on GitHub and pushes all project files
using either local Git or direct GitHub REST API.
"""
import os
import sys
import json
import base64
import subprocess
import urllib.request
import urllib.error

GITHUB_USER = "niikitaraj"
REPO_NAME = "SmeltIQ"
TOKEN = "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"

IGNORED_PATTERNS = {
    ".git", ".env", "backend/.env", "frontend/.env", 
    "node_modules", "__pycache__", ".venv", "venv", 
    ".vscode", ".idea", "dist", ".vite"
}

def is_ignored(path):
    parts = path.replace("\\", "/").split("/")
    for part in parts:
        if part in IGNORED_PATTERNS or part.endswith(".pyc") or part.endswith(".tmp"):
            return True
    if parts[-1].startswith(".env") and parts[-1] != ".env.example":
        return True
    return False

def make_request(url, method="GET", data=None):
    headers = {
        "Authorization": f"token {TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "SmeltIQ-Uploader"
    }
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(error_body)
        except Exception:
            return e.code, {"message": error_body}

def ensure_repo_exists():
    print(f"[*] Checking if repository {GITHUB_USER}/{REPO_NAME} exists...")
    status, res = make_request(f"https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}")
    if status == 200:
        print(f"[+] Repository {GITHUB_USER}/{REPO_NAME} already exists.")
        return True
    elif status == 404:
        print(f"[*] Creating repository {REPO_NAME} under user {GITHUB_USER}...")
        status_create, res_create = make_request(
            "https://api.github.com/user/repos", 
            method="POST", 
            data={
                "name": REPO_NAME,
                "description": "SmeltIQ Gate Entry Compliance & ANPR System (Vizag Steel Plant)",
                "private": False,
                "auto_init": False
            }
        )
        if status_create in (200, 201):
            print(f"[+] Successfully created repository: {res_create.get('html_url')}")
            return True
        else:
            print(f"[-] Failed to create repository (HTTP {status_create}): {res_create}")
            return False
    else:
        print(f"[-] Unexpected response from GitHub API (HTTP {status}): {res}")
        return False

def find_git():
    for candidate in [
        "git",
        r"C:\Program Files\Git\cmd\git.exe",
        r"C:\Program Files\Git\bin\git.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Git\cmd\git.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Git\cmd\git.exe")
    ]:
        try:
            res = subprocess.run([candidate, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if res.returncode == 0:
                return candidate
        except Exception:
            continue
    return None

def push_via_git(git_bin):
    print(f"[+] Found Git executable at: {git_bin}")
    remote_auth_url = f"https://{TOKEN}@github.com/{GITHUB_USER}/{REPO_NAME}.git"
    
    commands = [
        [git_bin, "init", "-b", "main"],
        [git_bin, "config", "user.name", GITHUB_USER],
        [git_bin, "config", "user.email", "dev@smeltiq.local"],
        [git_bin, "add", "."],
        [git_bin, "commit", "-m", "feat: Initial commit for SmeltIQ Gate Entry Compliance & ANPR System"],
        [git_bin, "remote", "remove", "origin"],
        [git_bin, "remote", "add", "origin", remote_auth_url],
        [git_bin, "push", "-u", "origin", "main", "--force"]
    ]
    
    for cmd in commands:
        cmd_display = " ".join([c if TOKEN not in c else c.replace(TOKEN, "***") for c in cmd])
        print(f"[*] Running: {cmd_display}")
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0 and "remove" not in cmd:
            print(f"[-] Command output: {res.stdout.strip()} | {res.stderr.strip()}")
            if "push" in cmd:
                return False
    print("[+] Git push completed successfully!")
    return True

def push_via_api():
    print("[*] Git CLI not found. Uploading project tree directly via GitHub Git Data API...")
    root_dir = os.path.abspath(os.path.dirname(__file__))
    
    tree_items = []
    total_files = 0
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        rel_dir = os.path.relpath(dirpath, root_dir)
        if rel_dir != "." and is_ignored(rel_dir):
            continue
        
        for file in filenames:
            rel_file = os.path.normpath(os.path.join(rel_dir, file)).replace("\\", "/")
            if rel_file.startswith("./"):
                rel_file = rel_file[2:]
            if is_ignored(rel_file) or file == "push_to_github.py":
                continue
            
            full_path = os.path.join(dirpath, file)
            try:
                with open(full_path, "rb") as f:
                    content_bytes = f.read()
                
                # Create blob
                content_b64 = base64.b64encode(content_bytes).decode("utf-8")
                blob_status, blob_res = make_request(
                    f"https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/git/blobs",
                    method="POST",
                    data={"content": content_b64, "encoding": "base64"}
                )
                if blob_status not in (200, 201):
                    print(f"[-] Failed to upload {rel_file}: {blob_res}")
                    continue
                
                tree_items.append({
                    "path": rel_file,
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob_res["sha"]
                })
                total_files += 1
                if total_files % 5 == 0:
                    print(f"    Uploaded {total_files} files...")
            except Exception as e:
                print(f"[-] Error reading {rel_file}: {e}")
                
    print(f"[+] Total files prepared: {len(tree_items)}")
    
    # Create tree
    print("[*] Creating GitHub Tree...")
    t_status, t_res = make_request(
        f"https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/git/trees",
        method="POST",
        data={"tree": tree_items}
    )
    if t_status not in (200, 201):
        print(f"[-] Failed to create tree: {t_res}")
        return False
    tree_sha = t_res["sha"]
    
    # Create commit
    print("[*] Creating Commit...")
    c_status, c_res = make_request(
        f"https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/git/commits",
        method="POST",
        data={
            "message": "feat: Initial commit for SmeltIQ Gate Entry Compliance & ANPR System",
            "tree": tree_sha,
            "parents": []
        }
    )
    if c_status not in (200, 201):
        print(f"[-] Failed to create commit: {c_res}")
        return False
    commit_sha = c_res["sha"]
    
    # Update / create ref
    print("[*] Updating main branch reference...")
    r_status, r_res = make_request(
        f"https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/git/refs",
        method="POST",
        data={"ref": "refs/heads/main", "sha": commit_sha}
    )
    if r_status not in (200, 201):
        # Try PATCH
        r_status, r_res = make_request(
            f"https://api.github.com/repos/{GITHUB_USER}/{REPO_NAME}/git/refs/heads/main",
            method="PATCH",
            data={"sha": commit_sha, "force": True}
        )
    
    if r_status in (200, 201):
        print(f"\n[SUCCESS] Project pushed successfully to https://github.com/{GITHUB_USER}/{REPO_NAME}")
        return True
    else:
        print(f"[-] Failed to update branch ref: {r_res}")
        return False

def main():
    print("=" * 60)
    print("  SmeltIQ Automated GitHub Uploader")
    print("=" * 60)
    if not ensure_repo_exists():
        sys.exit(1)
        
    git_bin = find_git()
    if git_bin:
        success = push_via_git(git_bin)
        if success:
            sys.exit(0)
        print("[!] Git push encountered an issue, trying GitHub API direct upload fallback...")
    
    success = push_via_api()
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
