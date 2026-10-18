import argparse
import json
from pathlib import Path

import requests

parser = argparse.ArgumentParser()
parser.add_argument("--period", required=True)
parser.add_argument(
    "--save-dir",
    help="Write every received artifact file into this folder.",
)
args = parser.parse_args()

save_directory = Path(args.save_dir) if args.save_dir else None
if save_directory:
    save_directory.mkdir(parents=True, exist_ok=True)


def save_artifact(artifact_file: dict) -> None:
    print(
        f"  file: {artifact_file['filename']} "
        f"({len(artifact_file['content'])} characters)"
    )
    if save_directory:
        (save_directory / artifact_file["filename"]).write_text(
            artifact_file["content"], encoding="utf-8"
        )


response = requests.post(
    "http://127.0.0.1:8000/api/analyze/stream",
    json={
        "goal": "Analyze historical gold futures prices.",
        "period": args.period,
    },
    stream=True,
)

response.raise_for_status()

current_event_name = ""

for line in response.iter_lines(decode_unicode=True):
    if not line:
        continue

    if line.startswith("event:"):
        current_event_name = line[6:].strip()
        continue

    if not line.startswith("data:"):
        continue

    payload = json.loads(line[5:].strip())

    if current_event_name == "artifact":
        print("event: artifact")
        save_artifact(payload)
    elif current_event_name == "final":
        print("event: final")
        print(f"  status: {payload['status']}")
        print(f"  interpretation: {payload['interpretation'][:200]}")
        for artifact_file in payload["metadata"]["files"]:
            save_artifact(artifact_file)
    elif current_event_name == "error":
        print(f"event: error\n  {payload['message']}")
        for artifact_file in payload.get("metadata", {}).get("files", []):
            save_artifact(artifact_file)
    else:
        print(f"event: {current_event_name}\n  {payload}")
