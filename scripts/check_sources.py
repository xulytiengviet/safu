#!/usr/bin/env python3
"""Collect source availability metadata, never mislabel retrieval as verification."""
import datetime as dt
import hashlib
import json
import os
import pathlib
import urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
URLS = {
 "upstream_snapshot": "https://fundsarenotsafu.com/snapshot.json",
 "upstream_trace": "https://fundsarenotsafu.com/trace.md",
 "binance_statement": "https://x.com/binance/status/2115993361517891592"
}
def fetch(url):
 try:
  req = urllib.request.Request(url, headers={"User-Agent":"safu-monitor/0.1 (public academic tracker)","Accept":"application/json,text/markdown,text/html"})
  with urllib.request.urlopen(req, timeout=20) as resp:
   body = resp.read(5_000_001)
   if len(body)>5_000_000:
    return {"ok":False,"error":"size_limit"}
   return {"ok":True,"httpStatus":resp.status,"sha256":hashlib.sha256(body).hexdigest(),"bytes":len(body),"lastModified":resp.headers.get("Last-Modified"),"etag":resp.headers.get("ETag"),"note":"Retrieval success does not imply that figures or claims were independently verified"}
 except Exception as exc:
  return {"ok":False,"error":str(exc)[:250]}
now=dt.datetime.now(dt.timezone.utc).isoformat()
results={name:fetch(url) for name,url in URLS.items()}
out={"checkedAtUTC":now,"checks":results,"mode":"source-health-only","warning":"This process never updates the validated historic accounting snapshot and is not a blockchain verification engine."}
p=ROOT/"data"/"source-health.json";p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"checkedAtUTC":now,"successes":sum(v["ok"] for v in results.values()),"total":len(results)}))
