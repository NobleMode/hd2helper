from typing import List, Dict

class Stratagem:
    def __init__(self, id: str, name: str, icon: str, keys: List[str], category: str):
        self.id = id
        self.name = name
        self.icon = icon
        self.keys = keys
        self.category = category

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "icon": self.icon,
            "keys": self.keys,
            "category": self.category
        }


import json
import os

def load_stratagems_from_json():
    json_path = os.path.join(os.path.dirname(__file__), 'stratagems.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return [Stratagem(**item) for item in data]
    except Exception as e:
        print(f"Error loading stratagems.json: {e}")
        return []

STRATAGEMS_DATA = load_stratagems_from_json()


def get_all_stratagems() -> List[Dict]:
    return [s.to_dict() for s in STRATAGEMS_DATA]

def get_stratagem_by_id(s_id: str) -> Stratagem:
    for s in STRATAGEMS_DATA:
        if s.id == s_id:
            return s
    return None


