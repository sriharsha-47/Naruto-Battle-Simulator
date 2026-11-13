from fastapi import APIRouter
from backend.api.schemas import SettingsSchema
from backend.api.settings_manager import settings_manager

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("", response_model=SettingsSchema)
def get_settings() -> SettingsSchema:
    return settings_manager.get_settings()


@router.put("", response_model=SettingsSchema)
def update_settings(new_settings: SettingsSchema) -> SettingsSchema:
    return settings_manager.update_settings(new_settings)
