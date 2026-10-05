import json
import joblib
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

MODEL_DIR = Path(__file__).resolve().parent / "supply_guard_models"

def load_model_and_config(model_filename, config_filename):
    model_path = MODEL_DIR / model_filename
    config_path = MODEL_DIR / config_filename

    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")

    model = joblib.load(model_path)
    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    return model, config

# Load all Supply Guard models
disruption_model, disruption_config = load_model_and_config(
    "disruption_model_v1.pkl",
    "disruption_model_config.json"
)

delay_model, delay_config = load_model_and_config(
    "delay_model_v1.pkl",
    "delay_model_config.json"
)

freight_cost_model, freight_cost_config = load_model_and_config(
    "freight_cost_model_v1.pkl",
    "freight_cost_model_config.json"
)