import argparse
import json

import requests

parser = argparse.ArgumentParser()
parser.add_argument("--start-date", help="YYYY-MM-DD. Defaults to the oldest date.")
parser.add_argument("--amount", type=float, default=5000.0, help="Rupees a month.")
parser.add_argument("--rate", type=float, default=6.5, help="RD percent a year.")
parser.add_argument("--retail-charge", type=float, default=15.0, help="Percent.")
parser.add_argument(
    "--buy-rule",
    choices=["lowest_in_window", "first_trading_day"],
    default="lowest_in_window",
)
parser.add_argument(
    "--compounding",
    choices=["simple", "monthly", "quarterly", "half_yearly", "yearly"],
    default="quarterly",
)
args = parser.parse_args()

response = requests.post(
    "http://127.0.0.1:8000/api/savings/monthly",
    json={
        "start_date": args.start_date,
        "monthly_investment_inr": args.amount,
        "annual_interest_rate_pct": args.rate,
        "compounding": args.compounding,
        "buy_rule": args.buy_rule,
        "retail_charge_pct": args.retail_charge,
    },
    timeout=300,
)
body = response.json()

if response.status_code != 200:
    print(f"HTTP {response.status_code}: {body.get('message')}")
    raise SystemExit(1)

print(f"Run {body['run_id']}")
print(json.dumps(body["request"], indent=2))
for month in body["skipped_months"]:
    print(f"Left out {month['month']}: {month['reason']}")
for view_name, view in body["views"].items():
    summary = view["summary"]
    print(f"\n=== {view_name.upper()} ({summary['installment_count']} installments) ===")
    print(json.dumps(summary["gold"], indent=2))
    print(json.dumps(summary["inr_rd"], indent=2))
    print(json.dumps(summary["comparison"], indent=2))
