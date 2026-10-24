import argparse
import json
from pathlib import Path

import requests

parser = argparse.ArgumentParser()
parser.add_argument("--horizon-weeks", type=int, default=52)
parser.add_argument("--frequency", choices=["daily", "weekly"], default="daily")
parser.add_argument("--save-dir", help="Write every returned file here.")
args = parser.parse_args()

response = requests.post(
    "http://127.0.0.1:8000/api/forecast",
    json={"horizon_weeks": args.horizon_weeks, "frequency": args.frequency},
    timeout=300,
)
body = response.json()

if response.status_code != 200:
    print(f"HTTP {response.status_code}: {body.get('message')}")
    print(f"Files produced before failure: {body['metadata']['file_count']}")
    raise SystemExit(1)

forecast = body["forecast"]
print(f"Run {body['run_id']}")
print(f"Forecast {forecast['start_date']} to {forecast['end_date']}")
print(f"{forecast['frequency'].capitalize()} price objects: {len(forecast['points'])}\n")

for series_name, summary in forecast["end_of_horizon"].items():
    print(
        f"{series_name}: {summary['latest']:.2f} -> {summary['forecast']:.2f} "
        f"({summary['change_pct']:+.2f}%), "
        f"range {summary['lower']:.2f} to {summary['upper']:.2f}"
    )

print("\nWarnings:")
for warning in body["warnings"]:
    print(f"- {warning}")

backtest = body["model"]["backtest"]
if backtest:
    print("\nBacktest (model vs no-change error, gold INR/g):")
    for result in backtest["results"]["gold_inr_per_gram"]:
        print(
            f"  {result['horizon_label']:>9}: model {result['model_mape_pct']:.2f}% "
            f"vs no-change {result['naive_mape_pct']:.2f}%"
        )

if args.save_dir:
    save_directory = Path(args.save_dir)
    save_directory.mkdir(parents=True, exist_ok=True)
    for artifact_file in body["metadata"]["files"]:
        (save_directory / artifact_file["filename"]).write_text(
            artifact_file["content"], encoding="utf-8"
        )
    (save_directory / "forecast_response_summary.json").write_text(
        json.dumps({k: v for k, v in body.items() if k != "metadata"}, indent=2)
    )
    print(f"\nSaved {body['metadata']['file_count']} files to {save_directory}")
