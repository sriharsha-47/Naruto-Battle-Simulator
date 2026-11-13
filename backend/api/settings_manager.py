from backend.ai.heuristic import HeuristicWeights
from backend.api.schemas import SettingsSchema


class SettingsManager:
    def __init__(self):
        self.settings = SettingsSchema()

    def get_settings(self) -> SettingsSchema:
        return self.settings

    def update_settings(self, new_settings: SettingsSchema) -> SettingsSchema:
        self.settings = new_settings
        return self.settings

    def get_heuristic_weights(self) -> HeuristicWeights:
        return HeuristicWeights(
            w1_own_hp=self.settings.w1_own_hp,
            w2_opp_hp=self.settings.w2_opp_hp,
            w3_own_chakra=self.settings.w3_own_chakra,
            w4_opp_chakra=self.settings.w4_opp_chakra,
            w5_status=self.settings.w5_status,
        )


settings_manager = SettingsManager()
