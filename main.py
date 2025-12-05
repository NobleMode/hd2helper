from fastapi import FastAPI, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
from typing import List
import urllib.request
import urllib.error
import json
import logging

from stratagems import get_all_stratagems, get_stratagem_by_id
from input_handler import execute_stratagem, execute_sequence_only

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Helldivers 2 Helper")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

class ExecuteRequest(BaseModel):
    stratagem_id: str
    mode: str = "hold" # 'hold', 'toggle', 'pre_call' (legacy: 'full'->'hold', 'sequence'->'pre_call')
    open_key: str = "ctrl"
    delay: int = 50 # milliseconds
    open_delay: int = 100 # milliseconds
    key_duration: int = 20 # milliseconds
    key_map: dict = None # Optional custom key map

# Serve the frontend
@app.get("/")
async def read_root():
    return FileResponse('static/index.html')

@app.get("/favicon.ico")
async def favicon():
    return FileResponse('static/media/icon/favicon.ico')


@app.get("/api/stratagems")
async def get_stratagems():
    return get_all_stratagems()

@app.get("/api/dss")
async def get_dss_status():
    url = "https://api.helldivers2.dev/raw/api/v2/SpaceStation/War/801/749875195"
    headers = {"X-Super-Client": "hd2helper", "X-Super-Contact": "bot"}
    
    # Mapping from DSS API ID to our ID
    dss_id_map = {
        1: "hellpod_optimization",
        2: "orbital_bombardment",
        3: "eagle_storm",
        4: "heavy_ordnance_distribution"
    }
    
    all_strats = get_all_stratagems()
    station_strats = [s for s in all_strats if s['category'] == 'Space Station']
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            tactical_actions = data.get('tacticalActions', [])
            active_ids = set()
            for action in tactical_actions:
                if action.get('status') == 2: 
                    dss_id = action.get('stratagemId')
                    if dss_id in dss_id_map:
                        active_ids.add(dss_id_map[dss_id])
            
            result = []
            for s in station_strats:
                result.append({
                    "id": s['id'],
                    "active": s['id'] in active_ids
                })
            
            return result

    except Exception as e:
        logger.error(f"DSS Fetch Error: {e}")
        return [{"id": s['id'], "active": False} for s in station_strats]


@app.post("/api/execute")
async def execute_stratagem_endpoint(req: ExecuteRequest):
    stratagem = get_stratagem_by_id(req.stratagem_id)
    if not stratagem:
        raise HTTPException(status_code=404, detail="Stratagem not found")
    
    # Convert ms to seconds
    delay_sec = req.delay / 1000.0
    open_delay_sec = req.open_delay / 1000.0
    key_duration_sec = req.key_duration / 1000.0
    
    # Backward compatibility for mode
    mode = req.mode
    if mode == "full": mode = "hold"
    if mode == "sequence": mode = "pre_call"
    
    execute_stratagem(
        stratagem.keys, 
        open_key=req.open_key, 
        mode=mode,
        delay=delay_sec,
        open_delay=open_delay_sec,
        key_duration=key_duration_sec,
        key_map=req.key_map
    )
        
    return {"status": "executed", "stratagem": stratagem.name}

if __name__ == "__main__":
    # Host on 0.0.0.0 to be accessible from phone
    uvicorn.run(app, host="0.0.0.0", port=8000)
