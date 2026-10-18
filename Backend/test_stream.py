import argparse

import requests

parser = argparse.ArgumentParser()
parser.add_argument("--period", required=True)
args = parser.parse_args()


response = requests.post(
    "http://127.0.0.1:8000/api/analyze/stream",
    json={
        "goal": (
            "Analyze historical gold futures prices."
        ),
        "period": args.period,
    },
    stream=True,
)

response.raise_for_status()

for line in response.iter_lines(decode_unicode=True):

    if line:
        print(line)