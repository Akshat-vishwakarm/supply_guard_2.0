export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RouteRiskFactors {
  port_congestion_index: number;
  weather_disruption_score: number;
  geopolitical_risk_score: number;
  container_availability_index: number;
  fuel_cost_index: number;
  commodity_price_index: number;
}

export interface NetworkExposure {
  route_id: string;
  direct_routes_exposed: string[];
  direct_routes_count: number;
  second_order_routes_exposed: string[];
  second_order_routes_count: number;
  avg_direct_risk: number;
  max_direct_risk: number;
  avg_second_order_risk: number;
  max_second_order_risk: number;
  ripple_risk_score: number;
  disruption_modeling_note: string;
}

export interface RouteItem {
  route_id: string;
  origin: string;
  destination: string;
  distance_km: number;
  shipping_method: string;
  trade_route_type: string;
  estimated_transit_days: number;
  date: string;
  trade_volume_tonnes: number;
  port_congestion_index: number;
  weather_disruption_score: number;
  geopolitical_risk_score: number;
  container_availability_index: number;
  fuel_cost_index: number;
  commodity_price_index: number;
  disruption_probability: number;
  disruption_probability_percent: number;
  predicted_delay_days: number;
  predicted_freight_cost_usd: number;
  supply_guard_score: number;
  risk_level: RiskLevel;
  ripple_risk_score: number;
  estimated_volume_at_risk_tonnes: number;
  delay_exposure_tonne_days: number;
  estimated_freight_cost_exposure_usd: number;
  network_exposure: NetworkExposure;
  has_sufficient_history?: boolean;
  error_status?: string;
  inventory_shortage_risk: string;
  methodology_note: string;
}

export interface DashboardKpis {
  is_loaded: boolean;
  is_demo: boolean;
  dataset_name: string;
  total_routes: number;
  critical_routes: number;
  high_risk_routes: number;
  medium_risk_routes: number;
  low_risk_routes: number;
  avg_predicted_delay_days: number;
  estimated_volume_at_risk_tonnes: number;
  estimated_freight_cost_exposure_usd: number;
  avg_ripple_risk: number;
  avg_supply_guard_score: number;
  avg_disruption_probability_percent: number;
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  top_risk_routes: RouteItem[];
  system_status: string;
  model_version: string;
}

export interface DataSessionStatus {
  is_loaded: boolean;
  is_demo: boolean;
  dataset_name: string;
  records: number;
  routes: number;
  date_min: string;
  date_max: string;
  columns: string[];
  insufficient_history_routes: string[];
  available_routes: string[];
}

export interface NetworkGraphNode {
  id: string;
  label: string;
  total_routes: number;
}

export interface NetworkGraphEdge {
  id: string;
  source: string;
  target: string;
  distance_km: number;
  shipping_method: string;
  trade_route_type: string;
  estimated_transit_days: number;
  risk_score: number;
  risk_level: RiskLevel;
  disruption_probability: number;
  predicted_delay_days: number;
  ripple_risk_score: number;
}

export interface NetworkGraphData {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
  total_nodes: number;
  total_edges: number;
  message?: string;
}

export interface SimulationResult {
  route_id: string;
  corridor: string;
  applied_shocks: {
    port_congestion_change: number;
    weather_disruption_change: number;
    geopolitical_risk_change: number;
    container_availability_change: number;
  };
  baseline: {
    disruption_probability_percent: number;
    predicted_delay_days: number;
    predicted_freight_cost_usd: number;
    supply_guard_score: number;
    ripple_risk_score: number;
    risk_level: RiskLevel;
    port_congestion_index: number;
    weather_disruption_score: number;
    geopolitical_risk_score: number;
    container_availability_index: number;
  };
  scenario: {
    disruption_probability_percent: number;
    predicted_delay_days: number;
    predicted_freight_cost_usd: number;
    supply_guard_score: number;
    ripple_risk_score: number;
    risk_level: RiskLevel;
    port_congestion_index: number;
    weather_disruption_score: number;
    geopolitical_risk_score: number;
    container_availability_index: number;
  };
  changes: {
    disruption_probability_change_pp: number;
    predicted_delay_change_days: number;
    predicted_freight_cost_change_usd: number;
    supply_guard_score_change: number;
    ripple_risk_change: number;
    risk_level_changed: boolean;
  };
}

export interface RecommendationItem {
  id: string;
  route_id: string;
  corridor: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  action: string;
  reason: string;
  status: 'Active' | 'Under Review' | 'Actioned' | 'Dismissed';
}

export interface RouteHistoryItem {
  date: string;
  port_congestion_index: number;
  weather_disruption_score: number;
  geopolitical_risk_score: number;
  container_availability_index: number;
  shipping_delay_days: number;
  freight_cost_usd: number;
  trade_volume_tonnes: number;
  route_status: string;
}

export interface BusinessImpactData {
  total_trade_volume_tonnes: number;
  total_volume_at_risk_tonnes: number;
  total_delay_exposure_tonne_days: number;
  total_freight_exposure_usd: number;
  top_routes_by_volume_at_risk: {
    route_id: string;
    corridor: string;
    volume_at_risk: number;
    trade_volume: number;
    risk_score: number;
    risk_level: RiskLevel;
  }[];
  top_routes_by_freight_exposure: {
    route_id: string;
    corridor: string;
    freight_exposure: number;
    predicted_cost: number;
    risk_score: number;
    risk_level: RiskLevel;
  }[];
  risk_vs_volume_scatter: {
    route_id: string;
    origin: string;
    destination: string;
    trade_volume_tonnes: number;
    supply_guard_score: number;
    disruption_probability_percent: number;
    estimated_volume_at_risk_tonnes: number;
    estimated_freight_cost_exposure_usd: number;
    risk_level: RiskLevel;
  }[];
  disclaimer: string;
}

export interface RouteAnalysisResult {
  route_id: string;
  status: 'success' | 'error';
  message?: string;
  latest_record: {
    trade_volume_tonnes: number;
    port_congestion_index: number;
    weather_disruption_score: number;
    geopolitical_risk_score: number;
    container_availability_index: number;
    fuel_cost_index: number;
    commodity_price_index: number;
  };
  ml_predictions?: {
    disruption_probability: number;
    disruption_probability_percent: number;
    predicted_delay_days: number;
    predicted_freight_cost_usd: number;
    risk_level: RiskLevel;
    supply_guard_score: number;
    ripple_risk_score: number;
  };
}

export interface WeatherPredictionRequest {
  country: string;
  city: string;
  prediction_date: string;
  include_timeline?: boolean;
  horizons?: number[];
}

export interface WeatherTimelineItem {
  horizon_days: number;
  date: string;
  display_date: string;
  prediction: string;
  weather_emoji: string;
  confidence_percent: number;
  weather_disruption_score: number;
  weather_risk_level: string;
  probabilities: Record<string, number>;
}

export interface WeatherPredictionResponse {
  model_available: boolean;
  country: string;
  city: string;
  prediction_date: string;
  prediction: string;
  predicted_weather?: string;
  weather_emoji: string;
  confidence: number;
  confidence_percent: number;
  probabilities: Record<string, number>;
  weather_disruption_score: number;
  weather_risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  coordinates: {
    latitude: number;
    longitude: number;
  };
  features_used?: Record<string, number>;
  transformation_summary?: string;
  timeline?: WeatherTimelineItem[];
  error?: string;
  detail?: any;
  supported_cities?: string[];
}

export interface WeatherImpactData {
  weather_prediction: string;
  weather_emoji: string;
  confidence_percent: number;
  weather_disruption_score: number;
  weather_risk_level: string;
  baseline_weather_score: number;
  disruption_prob_with_weather: number;
  disruption_prob_baseline: number;
  disruption_prob_delta_percent: number;
  delay_with_weather_days: number;
  delay_baseline_days: number;
  delay_delta_days: number;
  freight_cost_with_weather_usd: number;
  freight_cost_baseline_usd: number;
  freight_cost_delta_usd: number;
  score_delta: number;
  baseline_score: number;
  predicted_score: number;
}

export interface ForecastTimelineItem {
  horizon_days: number;
  date: string;
  display_date: string;
  weather_prediction: string;
  weather_emoji: string;
  weather_confidence: number;
  weather_disruption_score: number;
  weather_risk_level: string;
  disruption_probability_percent: number;
  predicted_delay_days: number;
  predicted_freight_cost_usd: number;
  supply_guard_score: number;
  risk_level: RiskLevel;
}

export interface PortItem {
  port_code: string;
  port_name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  tz_abbr?: string;
  currency: string;
}

export interface LocalTimePoint {
  iso: string;
  date: string;
  time: string;
  formatted: string;
  timezone: string;
  tz_abbr: string;
}

export interface RouteTimeline {
  departure_local: LocalTimePoint;
  arrival_local: LocalTimePoint;
  baseline_transit_days: number;
  predicted_delay_days: number;
  total_transit_days: number;
  arrival_date_str: string;
}

export interface EndpointWeatherPort {
  port_name: string;
  city: string;
  country: string;
  forecast_date: string;
  forecast_time: string;
  timezone: string;
  tz_abbr: string;
  weather: string;
  weather_emoji: string;
  confidence_percent?: number | null;
  weather_risk?: number | null;
  weather_risk_level?: string | null;
  probabilities?: Record<string, number>;
  available: boolean;
  message?: string;
}

export interface EndpointWeather {
  label: string;
  origin: EndpointWeatherPort;
  destination: EndpointWeatherPort;
}

export interface TransitEstimate {
  source: string;
  matched_route_id?: string | null;
  route_id?: string;
  is_known_route?: boolean;
  route_type?: string;
  transit_source?: string;
  baseline_transit_days: number;
  distance_km: number;
  shipping_method: string;
  trade_route_type: string;
  base_currency: string;
  quote_currency: string;
  currency_pair: string;
  origin_port: PortItem;
  destination_port: PortItem;
}

export interface PredictRequest {
  route_id: string;
  trade_volume_tonnes: number;
  container_availability_index: number;
  port_congestion_index: number;
  fuel_cost_index: number;
  commodity_price_index: number;
  weather_disruption_score: number;
  geopolitical_risk_score: number;
  route_status: 'Normal' | 'Delayed' | 'Disrupted' | string;
  base_currency?: string;
  quote_currency?: string;
  
  // Route Endpoints & Civil Timing
  origin_country?: string;
  origin_city?: string;
  destination_country?: string;
  destination_city?: string;
  departure_date?: string;
  departure_time?: string;
  baseline_transit_days?: number;

  prediction_mode?: 'quick' | 'historical';
  historical_records?: any[];

  // Weather Intelligence Layer
  prediction_type?: 'CURRENT' | 'FUTURE';
  country?: string;
  city?: string;
  prediction_date?: string;
  weather_prediction?: WeatherPredictionResponse | any;
  include_timeline?: boolean;
}

export interface PredictResponse {
  route_id: string;
  is_known_route?: boolean;
  route_type?: string;
  transit_source?: string;
  display_currency?: string;
  prediction_mode: 'quick' | 'historical';
  prediction_type?: 'CURRENT' | 'FUTURE';
  country?: string;
  city?: string;
  prediction_date?: string;
  weather_prediction?: WeatherPredictionResponse | null;
  mode_note: string;
  baseline_strategy: string;
  origin: string;
  origin_city?: string;
  origin_country?: string;
  origin_port?: string;
  destination: string;
  destination_city?: string;
  destination_country?: string;
  destination_port?: string;
  departure_date?: string;
  departure_time?: string;
  baseline_transit_days?: number;
  corridor: string;
  route_status: string;
  currency_pair: string;
  base_currency: string;
  quote_currency: string;
  trade_volume_tonnes: number;
  supply_guard_score: number;
  risk_level: RiskLevel;
  score_formula: string;
  disruption_probability: number;
  disruption_probability_percent: number;
  predicted_delay_days: number;
  predicted_freight_cost_usd: number;
  operating_threshold: number;
  risk_factors: RouteRiskFactors;
  
  // Route Timing & Timeline
  route_timeline?: RouteTimeline;
  timeline?: RouteTimeline;

  // Business Shipment Details & Freight Conversion
  shipment?: ShipmentDetails;
  freight_conversion?: FreightCostConversion;
  data_provenance?: DataProvenanceItem[];
  origin_weather?: WeatherPredictionResponse;
  destination_weather?: WeatherPredictionResponse;
  
  // Endpoint Weather Forecasts (Origin Port & Destination Port)
  endpoint_weather?: EndpointWeather;

  weather_forecast?: WeatherPredictionResponse | null;
  weather_impact?: WeatherImpactData | null;
  forecast_timeline?: ForecastTimelineItem[] | null;
  business_impact: {
    label: string;
    disclaimer: string;
    trade_volume_tonnes: number;
    estimated_volume_at_risk_tonnes: number;
    delay_exposure_tonne_days: number;
    estimated_freight_cost_exposure_usd: number;
    currency: string;
  };
  network_analysis: {
    available: boolean;
    message: string;
    direct_routes_exposed: string[];
    direct_routes_count: number;
    second_order_routes_exposed: string[];
    second_order_routes_count: number;
    avg_direct_risk?: number;
    max_direct_risk?: number;
    ripple_risk_score: number | null;
    note?: string;
  };
  recommendations: RecommendationItem[];
  raw_input: PredictRequest;
  feature_dict?: Record<string, number>;
  future_timeline?: any[];
  prediction_trace?: any;
  predictionTrace?: any;
  businessImpact?: any;
  networkImpact?: any;
  created_at: string;
}

export interface DataProvenanceItem {
  item: string;
  value: string;
  provenance: 'USER INPUT' | 'MODEL PREDICTION' | 'HISTORICAL DATA' | 'ROUTE DATA' | 'WEATHER MODEL' | 'DERIVED' | 'ESTIMATED' | 'UNAVAILABLE' | string;
  details: string;
}

export interface FreightCostConversion {
  model_amount_usd: number;
  model_currency: string;
  display_amount: number;
  display_currency: string;
  display_formatted: string;
  exchange_rate: number;
  rate_formatted: string;
  origin_currency_amount?: number;
  origin_currency_formatted?: string;
  dest_currency_amount?: number;
  dest_currency_formatted?: string;
  provenance: string;
}

export interface ShipmentRiskRequest {
  supplier_company: string;
  customer_company: string;
  receiving_company?: string;
  product_name: string;
  quantity: number;
  quantity_unit?: 'Units' | 'Tonnes' | 'Kilograms' | 'Containers' | string;
  shipment_weight: number;
  weight_unit?: 'kg' | 'tonnes' | string;
  commercial_value?: number;
  shipment_value?: number;
  currency?: string;

  origin?: {
    port: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  destination?: {
    port: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  };

  origin_port?: string;
  destination_port?: string;
  origin_country?: string;
  origin_city?: string;
  destination_country?: string;
  destination_city?: string;

  departure_date: string;
  departure_time?: string;

  shipment_status?: 'Normal' | 'Delayed' | 'Disrupted' | string;
  current_delay_days?: number;
  disruption_reason?: string;

  overrides?: {
    port_congestion?: number | null;
    weather_risk?: number | null;
    geopolitical_risk?: number | null;
    container_availability?: number | null;
    fuel_cost?: number | null;
    commodity_price?: number | null;
    [key: string]: any;
  };
}

export interface ShipmentDetails {
  supplier_company?: string;
  customer_company?: string;
  product_name?: string;
  quantity?: number;
  quantity_unit?: string;
  shipment_weight?: number;
  weight_unit?: string;
  shipment_value?: number;
  currency?: string;
  origin_port?: string;
  destination_port?: string;
  origin_country?: string;
  destination_country?: string;
  departure_formatted?: string;
  baseline_transit_days?: number;
  route_type?: string;
}

export interface CustomSimulationRequest {
  baseline_input: PredictRequest | ShipmentRiskRequest | Record<string, any>;
  scenario_inputs: Partial<PredictRequest> | Record<string, any>;
  weather_mode?: 'MANUAL' | 'WEATHER_MODEL';
  country?: string;
  city?: string;
  prediction_date?: string;
}

export interface CustomSimulationResponse {
  route_id: string;
  corridor: string;
  weather_mode?: string;
  weather_forecast?: WeatherPredictionResponse | null;
  shipment?: ShipmentDetails;
  baseline: {
    disruption_probability: number;
    disruption_probability_percent: number;
    predicted_delay_days: number;
    predicted_freight_cost_usd: number;
    display_freight_cost?: string;
    supply_guard_score: number;
    risk_level: RiskLevel;
    estimated_arrival?: string;
    estimated_volume_at_risk_tonnes: number;
    estimated_freight_cost_exposure_usd: number;
    timeline?: RouteTimeline;
    conditions: RouteRiskFactors;
  };
  scenario: {
    disruption_probability: number;
    disruption_probability_percent: number;
    predicted_delay_days: number;
    predicted_freight_cost_usd: number;
    display_freight_cost?: string;
    supply_guard_score: number;
    risk_level: RiskLevel;
    estimated_arrival?: string;
    estimated_volume_at_risk_tonnes: number;
    estimated_freight_cost_exposure_usd: number;
    timeline?: RouteTimeline;
    conditions: RouteRiskFactors;
  };
  delta: {
    weather_risk_delta?: number;
    disruption_delta_percent: number;
    delay_delta_days: number;
    freight_delta_usd: number;
    risk_score_delta: number;
    risk_level_changed: boolean;
    volume_at_risk_delta_tonnes: number;
    new_estimated_arrival?: string;
  };
}


