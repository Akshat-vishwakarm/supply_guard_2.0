import {
  DashboardKpis,
  RouteItem,
  NetworkGraphData,
  SimulationResult,
  RecommendationItem,
  RouteHistoryItem,
  BusinessImpactData,
  DataSessionStatus,
  RouteAnalysisResult,
  PredictRequest,
  PredictResponse,
  CustomSimulationRequest,
  CustomSimulationResponse,
  WeatherPredictionRequest,
  WeatherPredictionResponse,
  PortItem,
  TransitEstimate,
  ShipmentRiskRequest
} from '../types/supplyGuard';

const getApiBaseUrl = (): string => {
  // 1. Check for explicit environment variable configured in Vite/Vercel
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    const cleanUrl = envUrl.trim().replace(/\/+$/, '');
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
  }

  // 2. Production Vercel / Web fallback: use relative /api (proxied via vercel.json rewrite)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }

  // 3. Local development fallback
  return 'http://127.0.0.1:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorBody = await response.text();
    let parsedMsg = errorBody;
    try {
      const json = JSON.parse(errorBody);
      if (json.error && typeof json.error === 'object' && json.error.message) {
        parsedMsg = json.error.message;
      } else if (json.detail) {
        if (typeof json.detail === 'object' && json.detail.error) {
          parsedMsg = json.detail.error;
        } else if (typeof json.detail === 'string') {
          parsedMsg = json.detail;
        }
      }
    } catch {}
    throw new Error(parsedMsg);
  }
  return response.json();
}

export const api = {
  checkHealth: async () => {
    return fetchJson<{ status: string; system: string; dataset_loaded: boolean; is_demo: boolean }>(`${API_BASE_URL}/health`);
  },

  getPorts: async (): Promise<{ total_ports: number; ports: PortItem[] }> => {
    return fetchJson<{ total_ports: number; ports: PortItem[] }>(`${API_BASE_URL}/ports`);
  },

  getTransitEstimate: async (data: {
    origin_country: string;
    origin_city?: string;
    destination_country: string;
    destination_city?: string;
    shipping_method?: string;
  }): Promise<TransitEstimate> => {
    return fetchJson<TransitEstimate>(`${API_BASE_URL}/routes/transit-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  predictWeather: async (data: WeatherPredictionRequest): Promise<WeatherPredictionResponse> => {
    return fetchJson<WeatherPredictionResponse>(`${API_BASE_URL}/weather/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  getWeatherLocations: async (): Promise<{
    model_available: boolean;
    total_locations: number;
    locations: { city: string; country: string; latitude: number; longitude: number }[];
  }> => {
    return fetchJson(`${API_BASE_URL}/weather/locations`);
  },

  analyzeShipment: async (data: any): Promise<any> => {
    return fetchJson(`${API_BASE_URL}/analyze-shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  simulateShipment: async (data: {
    baselineShipment: any;
    scenario: any;
    weather_mode?: string;
    country?: string;
    city?: string;
    prediction_date?: string;
  }): Promise<any> => {
    return fetchJson(`${API_BASE_URL}/shipment/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  predictRisk: async (data: PredictRequest): Promise<PredictResponse> => {
    return fetchJson<PredictResponse>(`${API_BASE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  predictRiskFuture: async (data: PredictRequest): Promise<PredictResponse> => {
    return fetchJson<PredictResponse>(`${API_BASE_URL}/risk/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  simulateCustom: async (data: CustomSimulationRequest): Promise<CustomSimulationResponse> => {
    return fetchJson<CustomSimulationResponse>(`${API_BASE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  uploadCsv: async (file: File): Promise<{
    success: boolean;
    filename: string;
    is_demo: boolean;
    records: number;
    routes: number;
    date_min: string;
    date_max: string;
    columns: string[];
    insufficient_history_routes: string[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchJson(`${API_BASE_URL}/data/upload`, {
      method: 'POST',
      body: formData
    });
  },

  loadDemoDataset: async () => {
    return fetchJson<{
      success: boolean;
      filename: string;
      is_demo: boolean;
      records: number;
      routes: number;
      date_min: string;
      date_max: string;
      columns: string[];
    }>(`${API_BASE_URL}/data/load-demo`, {
      method: 'POST'
    });
  },

  clearDataset: async () => {
    return fetchJson<{ success: boolean; message: string }>(`${API_BASE_URL}/data/clear`, {
      method: 'POST'
    });
  },

  getDataStatus: async (): Promise<DataSessionStatus> => {
    return fetchJson<DataSessionStatus>(`${API_BASE_URL}/data/status`);
  },

  getDashboard: async (): Promise<DashboardKpis> => {
    return fetchJson<DashboardKpis>(`${API_BASE_URL}/dashboard`);
  },

  getRoutes: async (params?: { risk_level?: string; search?: string; sort_by?: string }): Promise<{ total: number; routes: RouteItem[] }> => {
    const query = new URLSearchParams();
    if (params?.risk_level) query.append('risk_level', params.risk_level);
    if (params?.search) query.append('search', params.search);
    if (params?.sort_by) query.append('sort_by', params.sort_by);
    return fetchJson<{ total: number; routes: RouteItem[] }>(`${API_BASE_URL}/routes?${query.toString()}`);
  },

  getRouteDetail: async (routeId: string): Promise<RouteItem> => {
    return fetchJson<RouteItem>(`${API_BASE_URL}/routes/${routeId}`);
  },

  analyzeRoute: async (routeId: string): Promise<RouteAnalysisResult> => {
    return fetchJson<RouteAnalysisResult>(`${API_BASE_URL}/routes/${routeId}/analyze`, {
      method: 'POST'
    });
  },

  getRouteNetwork: async (routeId: string) => {
    return fetchJson<any>(`${API_BASE_URL}/routes/${routeId}/network`);
  },

  getRouteImpact: async (routeId: string) => {
    return fetchJson<any>(`${API_BASE_URL}/routes/${routeId}/impact`);
  },

  getRouteRecommendations: async (routeId: string): Promise<{ route_id: string; total_recommendations: number; recommendations: RecommendationItem[] }> => {
    return fetchJson<{ route_id: string; total_recommendations: number; recommendations: RecommendationItem[] }>(`${API_BASE_URL}/routes/${routeId}/recommendations`);
  },

  getRouteHistory: async (routeId: string, limit: number = 52): Promise<{ route_id: string; total_records: number; history: RouteHistoryItem[] }> => {
    return fetchJson<{ route_id: string; total_records: number; history: RouteHistoryItem[] }>(`${API_BASE_URL}/routes/${routeId}/history?limit=${limit}`);
  },

  getRouteExplanation: async (routeId: string): Promise<{ route_id: string; explanation: string }> => {
    return fetchJson<{ route_id: string; explanation: string }>(`${API_BASE_URL}/routes/${routeId}/explain`);
  },

  getNetworkGraph: async (): Promise<NetworkGraphData> => {
    return fetchJson<NetworkGraphData>(`${API_BASE_URL}/network`);
  },

  getBusinessImpact: async (): Promise<BusinessImpactData> => {
    return fetchJson<BusinessImpactData>(`${API_BASE_URL}/business-impact`);
  },

  getRecommendations: async (): Promise<{ total: number; recommendations: RecommendationItem[] }> => {
    return fetchJson<{ total: number; recommendations: RecommendationItem[] }>(`${API_BASE_URL}/recommendations`);
  },

  simulateScenario: async (payload: {
    route_id: string;
    congestion_change: number;
    weather_change: number;
    geopolitical_change: number;
    container_change: number;
  }): Promise<SimulationResult> => {
    return fetchJson<SimulationResult>(`${API_BASE_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  },

  generateExecutiveReport: async (): Promise<{
    generated_at: string;
    report_title: string;
    report_markdown: string;
    kpis_snapshot: DashboardKpis;
  }> => {
    return fetchJson<{
      generated_at: string;
      report_title: string;
      report_markdown: string;
      kpis_snapshot: DashboardKpis;
    }>(`${API_BASE_URL}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
