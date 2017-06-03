import json
import random

areas = [
    "Back",
    "Sensory",
    "Arms",
    "Leg",
    "Neck",
    "Shoulder",
    "All"
]

types = [
    "Burning",
    "Pulsing",
    "Throbbing",
    "Numb"
]

with open('user_points.geojson', 'r') as f:
    user_points = json.load(f)['features'][::100]
    entries = []
    points_per_user = len(user_points) // 5
    type_id = random.randint(0, len(types) - 1)
    area_id = random.randint(0, len(areas) - 1)
    for n, user_point in enumerate(user_points):
        entries.append({
            "id": n,
            "user_id": n // points_per_user,
            "category": "ENTRY_PAIN",
            "type": {
              "id": type_id,
              "name": types[type_id],
              "parent_id": "1",
              "parent_name": "physical"
            },
            "area": areas[area_id],
            "score": 0.1 * random.randrange(0, 100),
            "log_time": "2017-04-%02d %02d:%02d:%02d" % (
                random.randint(0, 29),
                random.randint(0, 23),
                random.randint(0, 59),
                random.randint(0, 59)
            ),
            "start_time": "2017-04-03 09:00:00",
            "end_time": "2017-04-03 12:00:00",
            "location": {
              "latitude": user_point['geometry']['coordinates'][1],
              "longitude": user_point['geometry']['coordinates'][0]
            },
            "notes": "Consistent burning throughout the morning"
        })

print(json.dumps(entries))
