from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    severity = Column(String, index=True)
    alert_type = Column(String, index=True) # type is reserved, using alert_type
    message = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="alerts")
