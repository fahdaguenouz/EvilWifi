from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    ssid = Column(String, index=True)
    interface = Column(String)

    devices = relationship("Device", back_populates="session")
    events = relationship("Event", back_populates="session")
    alerts = relationship("Alert", back_populates="session")
