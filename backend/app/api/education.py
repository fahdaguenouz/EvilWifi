from fastapi import APIRouter, HTTPException

from app.services.education import educational_context, learning_modules


router = APIRouter(prefix="/api/education", tags=["Educational Mode"])


@router.get("/topics")
def get_learning_modules():
    return learning_modules()


@router.get("/events/{event_type}")
def get_event_education(event_type: str):
    return educational_context(event_type)


@router.get("/topics/{topic_id}")
def get_learning_module(topic_id: str):
    module = next((item for item in learning_modules() if item["id"] == topic_id), None)
    if module is None:
        raise HTTPException(status_code=404, detail="Learning module not found.")
    return module
