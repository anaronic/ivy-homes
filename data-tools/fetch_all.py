import json, time
from pathlib import Path
import os, requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
BASE = os.environ["IVY_BASE_URL"]
KEY = os.environ["IVY_API_KEY"]

session = requests.Session()
session.headers.update({"X-API-Key": KEY})

# 1. login once, reuse the token for the whole session
resp = session.post(f"{BASE}/auth/login", json={
    "email": os.environ["IVY_DEMO_EMAIL"],
    "password": os.environ["IVY_DEMO_PASSWORD"],
})
print(resp.status_code, resp.text)
resp.raise_for_status()
token = resp.json()["access_token"]

session.headers.update({"Authorization": f"Bearer {token}"})
session.params = {"api_key": KEY}   # applied to every request automatically

# 2. now just call endpoints
r = session.get(f"{BASE}/v1/listings", params={"page": 1, "limit": 200})
print(r.status_code, r.json()["total"])

def fetch_all(path, extra_params=None):
    results, page = [], 1
    while True:
        r = session.get(f"{BASE}{path}", params={**(extra_params or {}), "page": page, "limit": 200})
        r.raise_for_status()
        body = r.json()
        results.extend(body["results"])
        if page * 200 >= body["total"]:
            break
        page += 1
        time.sleep(0.05)  # be polite, you have 1200/min anyway
    return results

#listings = fetch_all("/v1/listings")
#json.dump(listings, open("data/listings.json", "w"), indent=2)

rentals = fetch_all("/v1/rentals")
json.dump(rentals, open("data/rentals.json", "w"), indent=2)

projects = fetch_all("/v1/projects")
json.dump(projects, open("data/projects.json", "w"), indent=2)