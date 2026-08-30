from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from app.core.database import get_db
from app.models.device import Device

router = APIRouter(prefix="/api/devices", tags=["Devices"])

@router.get("/")
def get_devices(db: DBSession = Depends(get_db)):
    return db.query(Device).all()

@router.get("/{device_id}")
def get_device(device_id: int, db: DBSession = Depends(get_db)):
    return db.query(Device).filter(Device.id == device_id).first()
