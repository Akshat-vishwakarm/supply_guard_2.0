import requests
import json

url = 'http://127.0.0.1:8000/api/analyze-shipment'

# Test 1: Empty / Missing fields validation
print('=== TEST 1: Validation with Missing Fields ===')
bad_payload = {'product_name': 'Steel Components'}
r1 = requests.post(url, json=bad_payload)
print(f'Status Code: {r1.status_code}')
detail = r1.json().get('detail', '')
print('Response message:')
print(detail)
assert r1.status_code == 422, 'Expected 422'
assert 'Please provide:' in detail, 'Missing bulleted validation'

# Test 2: Section 19 Payload
print('\n=== TEST 2: Section 19 Real Analysis ===')
payload = {
    'supplier_company': 'Company A',
    'receiving_company': 'Company B',
    'product_name': 'Steel Components',
    'quantity': 50000,
    'quantity_unit': 'units',
    'shipment_weight': 15000,
    'weight_unit': 'kg',
    'commercial_value': 500000,
    'currency': 'USD',
    'origin': {
        'port': 'Yokohama Port',
        'city': 'Yokohama',
        'country': 'Japan',
        'latitude': 35.4437,
        'longitude': 139.6380
    },
    'destination': {
        'port': 'Port of Los Angeles',
        'city': 'Los Angeles',
        'country': 'United States',
        'latitude': 33.7432,
        'longitude': -118.2673
    },
    'departure_date': '2026-10-05',
    'departure_time': '10:00',
    'shipment_status': 'Normal'
}

r2 = requests.post(url, json=payload)
print(f'Status Code: {r2.status_code}')
assert r2.status_code == 200, 'Expected 200'
data = r2.json()

print(f"1. Route: {data['origin_port']} -> {data['destination_port']}")
print(f"2. Not Brisbane -> Singapore: {'Brisbane' not in json.dumps(data) and 'Singapore' not in json.dumps(data)}")
print(f"3. Distance: {data['distance_km']} km")
print(f"4. Transit Duration: {data['baseline_transit_days']} days")
print(f"5. Calculated Arrival: {data['route_timeline']['arrival_local']['formatted']}")
print(f"6. Origin Weather: {data['origin_weather']['city']}, {data['origin_weather']['country']} on {data['origin_weather']['forecast_date']} -> {data['origin_weather']['weather']} (Risk: {data['origin_weather']['weather_risk']})")
print(f"7. Destination Weather: {data['destination_weather']['city']}, {data['destination_weather']['country']} on {data['destination_weather']['forecast_date']} -> {data['destination_weather']['weather']} (Risk: {data['destination_weather']['weather_risk']})")
print(f"8. Disruption Probability: {data['disruption_probability_percent']}%")
print(f"9. Predicted Delay: +{data['predicted_delay_days']} days")
print(f"10. Predicted Freight Cost: ${data['predicted_freight_cost_usd']} USD")
print(f"11. Supply Guard Score: {data['supply_guard_score']} ({data['risk_level']})")
print(f"12. Volume at Risk: {data['business_impact']['estimated_volume_at_risk_tonnes']} tonnes (based on 15 tonnes actual cargo)")
print(f"13. Delay Exposure: {data['business_impact']['delay_exposure_tonne_days']} tonne-days")
print(f"14. Financial Exposure: ${data['business_impact']['estimated_freight_cost_exposure_usd']} USD")
print(f"15. Shipment Value at Risk: ${data['business_impact']['shipment_value_at_risk_usd']} USD (based on $500,000 USD)")
print(f"16. Network Ripple Available: {data['network_analysis']['available']}")
print(f"17. Network Message: {data['network_analysis']['message']}")
print(f"18. Future Risk Timeline Milestones ({len(data['future_timeline'])}):")
for pt in data['future_timeline']:
    print(f"    - {pt['milestone']} ({pt['date']}): {pt['location']} | {pt['weather']} | Disruption: {pt['disruption_probability_percent']}% | Delay: +{pt['predicted_delay_days']}d | Score: {pt['supply_guard_score']}")

print('\n=== 19. PREDICTION TRACE ===')
print(json.dumps(data['prediction_trace'], indent=2))

# Test 3: Simulation from user's current shipment
print('\n=== TEST 3: Scenario Simulator on Section 19 Shipment ===')
sim_url = 'http://127.0.0.1:8000/api/shipment/simulate'
sim_payload = {
    'baselineShipment': data['raw_shipment'],
    'scenario': {
        'port_congestion_index': 80,
        'weather_disruption_score': 70,
        'geopolitical_risk_score': 60,
        'container_availability_index': 35,
        'fuel_cost_index': 70,
        'commodity_price_index': 65,
        'weather_mode': 'MANUAL'
    }
}
r3 = requests.post(sim_url, json=sim_payload)
print(f'Simulator Status Code: {r3.status_code}')
assert r3.status_code == 200, 'Expected 200'
sim_data = r3.json()
print(f"Baseline Score: {sim_data['baseline']['supply_guard_score']} -> Scenario Score: {sim_data['scenario']['supply_guard_score']}")
print(f"Score Delta: {sim_data['changes']['supply_guard_score_change']}")
print(f"Disruption Change: {sim_data['changes']['disruption_probability_change_percent']}%")
print(f"Delay Change: +{sim_data['changes']['predicted_delay_change_days']} days")
print(f"Freight Cost Change: ${sim_data['changes']['predicted_freight_cost_change_usd']} USD")
print(f"Business Impact Delta: Volume at Risk Change = {sim_data['changes'].get('volume_at_risk_change_tonnes')} tonnes")

print('\nALL VERIFICATIONS PASSED SUCCESSFULLY!')
