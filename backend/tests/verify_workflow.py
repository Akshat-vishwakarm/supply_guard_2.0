import urllib.request
import json
import sys

base = 'http://127.0.0.1:8000/api'

# Ensure clean starting state
req = urllib.request.Request(f'{base}/data/clear', data=b'', method='POST')
urllib.request.urlopen(req)

print('--- STEP 1: INITIAL STATE (FRESH STARTUP) ---')
with urllib.request.urlopen(f'{base}/data/status') as res:
    status = json.loads(res.read())
    print('Status is_loaded:', status['is_loaded'])
    assert not status['is_loaded']

with urllib.request.urlopen(f'{base}/dashboard') as res:
    dash = json.loads(res.read())
    print('Dashboard total_routes:', dash['total_routes'], 'system_status:', dash['system_status'])
    assert dash['total_routes'] == 0

with urllib.request.urlopen(f'{base}/routes') as res:
    routes_res = json.loads(res.read())
    print('Routes count:', routes_res['total'])
    assert routes_res['total'] == 0

print('\n--- STEP 2: LOAD DEMO DATASET ---')
req = urllib.request.Request(f'{base}/data/load-demo', data=b'', method='POST')
with urllib.request.urlopen(req) as res:
    load_res = json.loads(res.read())
    print('Loaded demo successfully! Routes:', load_res['routes'], 'Records:', load_res['records'])
    assert load_res['routes'] == 50

with urllib.request.urlopen(f'{base}/data/status') as res:
    status = json.loads(res.read())
    print('Status is_demo:', status['is_demo'], 'is_loaded:', status['is_loaded'])
    assert status['is_demo'] and status['is_loaded']

with urllib.request.urlopen(f'{base}/dashboard') as res:
    dash = json.loads(res.read())
    print('Dashboard loaded: Total:', dash['total_routes'], 'Critical:', dash['critical_routes'], 'High:', dash['high_risk_routes'], 'Avg Delay:', dash['avg_predicted_delay_days'], 'Est Volume At Risk (t):', dash['estimated_volume_at_risk_tonnes'])
    assert dash['total_routes'] == 50

print('\n--- STEP 3: ANALYZE ROUTE R00012 ---')
req = urllib.request.Request(f'{base}/routes/R00012/analyze', data=b'', method='POST')
with urllib.request.urlopen(req) as res:
    r_res = json.loads(res.read())
    print('R00012 Analysis:')
    print('  Disruption Probability:', f"{r_res['disruption_probability'] * 100:.2f}%")
    print('  Predicted Delay:', f"{r_res['predicted_delay_days']:.2f} days")
    print('  Predicted Freight Cost: $', f"{r_res['predicted_freight_cost_usd']:.2f}")
    print('  Supply Guard Risk Score:', r_res['risk_score'], '(', r_res['risk_level'], ')')
    assert r_res['disruption_probability'] > 0

print('\n--- STEP 4: SCENARIO SIMULATION (+20 Congestion, +10 Weather, +20 Geopolitical, -10 Container) ---')
sim_payload = json.dumps({
    'route_id': 'R00012',
    'congestion_change': 20,
    'weather_change': 10,
    'geopolitical_change': 20,
    'container_change': -10
}).encode('utf-8')
req = urllib.request.Request(f'{base}/simulate', data=sim_payload, headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req) as res:
    sim_res = json.loads(res.read())
    print(f"{'Metric':<22} | {'BASELINE':<15} | {'SCENARIO':<15} | {'CHANGE':<12}")
    print('-' * 70)
    print(f"{'Disruption Prob':<22} | {sim_res['baseline']['disruption_probability']:>14.4f} | {sim_res['scenario']['disruption_probability']:>14.4f} | {sim_res['delta']['disruption_delta']:>+11.4f}")
    print(f"{'Predicted Delay (days)':<22} | {sim_res['baseline']['predicted_delay_days']:>14.2f} | {sim_res['scenario']['predicted_delay_days']:>14.2f} | {sim_res['delta']['delay_delta']:>+11.2f}")
    print(f"{'Freight Cost ($)':<22} | {sim_res['baseline']['predicted_freight_cost_usd']:>14.2f} | {sim_res['scenario']['predicted_freight_cost_usd']:>14.2f} | {sim_res['delta']['freight_delta']:>+11.2f}")
    print(f"{'Risk Score':<22} | {sim_res['baseline']['risk_score']:>14.2f} | {sim_res['scenario']['risk_score']:>14.2f} | {sim_res['delta']['risk_score_delta']:>+11.2f}")
    print(f"{'Risk Level':<22} | {sim_res['baseline']['risk_level']:>14} | {sim_res['scenario']['risk_level']:>14} | {'--':>11}")
    assert sim_res['delta']['disruption_delta'] != 0

print('\n--- STEP 5: CLEAR DATASET ---')
req = urllib.request.Request(f'{base}/data/clear', data=b'', method='POST')
with urllib.request.urlopen(req) as res:
    clear_res = json.loads(res.read())
    print('Cleared:', clear_res['message'])

with urllib.request.urlopen(f'{base}/data/status') as res:
    status_after = json.loads(res.read())
    print('Status after clear: is_loaded =', status_after['is_loaded'])
    assert not status_after['is_loaded']

with urllib.request.urlopen(f'{base}/dashboard') as res:
    dash_after = json.loads(res.read())
    print('Dashboard after clear: total_routes =', dash_after['total_routes'])
    assert dash_after['total_routes'] == 0

print('\n>>> COMPLETE END-TO-END PIPELINE VERIFIED SUCCESSFULLY! <<<')
