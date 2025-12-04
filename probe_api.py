import urllib.request
import json

headers = {
    "X-Super-Client": "hd2helper",
    "X-Super-Contact": "bot"
}

endpoints = [
    "https://api.helldivers2.dev/raw/api/v2/SpaceStation/War/801/749875195"
]

for url in endpoints:
    print(f"Fetching {url}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            data = response.read().decode('utf-8')
            print(f"Status: {response.status}")
            with open('campaigns.json', 'w') as f:
                f.write(data)
            print("Saved to campaigns.json")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 20)
