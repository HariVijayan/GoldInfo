import argparse
import json

import requests

parser = argparse.ArgumentParser()
parser.add_argument("--start-date", help="YYYY-MM-DD. Defaults to the oldest date.")
parser.add_argument("--gold-grams", type=float, default=1.0)
parser.add_argument("--inr-amount", type=float, help="Defaults to the gold's cost.")
parser.add_argument("--rate", type=float, default=6.5, help="Percent a year.")
parser.add_argument("--retail-charge", type=float, default=15.0, help="Percent.")
parser.add_argument(
    "--compounding",
    choices=["simple", "monthly", "quarterly", "half_yearly", "yearly"],
    default="quarterly",
)
args = parser.parse_args()

response = requests.post(
    "http://127.0.0.1:8000/api/savings",
    json={
        "start_date": args.start_date,
        "gold_grams": args.gold_grams,
        "inr_savings_amount": args.inr_amount,
        "annual_interest_rate_pct": args.rate,
        "compounding": args.compounding,
        "retail_charge_pct": args.retail_charge,
    },
    timeout=300,
)
body = response.json()

if response.status_code != 200:
    print(f"HTTP {response.status_code}: {body.get('message')}")
    raise SystemExit(1)

print(f"Run {body['run_id']}")
print(
    f"{body['request']['effective_start_date']} to {body['request']['end_date']} "
    f"(retail charge {body['request']['retail_charge_pct']}%)"
)
for view_name, view in body["views"].items():
    summary = view["summary"]
    print(f"\n=== {view_name.upper()} ({summary['holding_years']:.1f} years) ===")
    print(json.dumps(summary["gold"], indent=2))
    print(json.dumps(summary["inr_savings"], indent=2))
    print(json.dumps(summary["comparison"], indent=2))
for warning in body["warnings"][:3]:
    print(f"- {warning}")
