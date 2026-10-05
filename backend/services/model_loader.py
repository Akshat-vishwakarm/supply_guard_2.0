import json
import joblib
import warnings
from pathlib import Path
from backend.config import (
    MODEL_DIR,
    DISRUPTION_MODEL_PKL,
    DISRUPTION_CONFIG_JSON,
    DELAY_MODEL_PKL,
    DELAY_CONFIG_JSON,
    FREIGHT_COST_MODEL_PKL,
    FREIGHT_COST_CONFIG_JSON,
)

# Suppress sklearn unpickling warning for clean logs
warnings.filterwarnings("ignore", category=UserWarning)

class ModelRegistry:
    _instance = None

    def __init__(self):
        self.disruption_model = None
        self.disruption_config = None
        self.delay_model = None
        self.delay_config = None
        self.freight_cost_model = None
        self.freight_cost_config = None
        self._load_all()

    def _load_model_and_config(self, model_path: Path, config_path: Path):
        if not model_path.exists():
            raise FileNotFoundError(f"Model not found at: {model_path}")
        if not config_path.exists():
            raise FileNotFoundError(f"Config not found at: {config_path}")

        model = joblib.load(model_path)
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        return model, config

    def _load_all(self):
        self.disruption_model, self.disruption_config = self._load_model_and_config(
            DISRUPTION_MODEL_PKL, DISRUPTION_CONFIG_JSON
        )
        self.delay_model, self.delay_config = self._load_model_and_config(
            DELAY_MODEL_PKL, DELAY_CONFIG_JSON
        )
        self.freight_cost_model, self.freight_cost_config = self._load_model_and_config(
            FREIGHT_COST_MODEL_PKL, FREIGHT_COST_CONFIG_JSON
        )

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

# Singleton helper
def get_models():
    return ModelRegistry.get_instance()
