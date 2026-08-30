from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    event_type = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    event_metadata = Column(JSON, default={}) # Using event_metadata because metadata is reserved

    session = relationship("Session", back_populates="events")
    device = relationship("Device", back_populates="events")
