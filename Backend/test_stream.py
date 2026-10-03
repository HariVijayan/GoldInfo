import requests


response = requests.post(
    "http://127.0.0.1:8000/api/analyze/stream",
    json={
        "goal": (
            "Analyze approximately one year of "
            "historical gold futures prices."
        )
    },
    stream=True,
)

response.raise_for_status()

for line in response.iter_lines(decode_unicode=True):

    if line:
        print(line)