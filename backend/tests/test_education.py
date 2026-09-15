import pytest
from fastapi import HTTPException

from app.api.education import get_learning_module, get_learning_modules
from app.services.education import EVENT_EDUCATION, educational_context, learning_modules


REQUIRED_EXPLANATIONS = {
    "what_happened",
    "why_it_matters",
    "attacker_could_learn",
    "how_to_protect",
}


def test_every_supported_event_answers_the_four_learning_questions():
    for event_type in EVENT_EDUCATION:
        context = educational_context(event_type)
        assert REQUIRED_EXPLANATIONS.issubset(context)
        assert all(context[key] for key in REQUIRED_EXPLANATIONS)


def test_unknown_event_has_safe_generic_explanation():
    context = educational_context("future_event")
    assert REQUIRED_EXPLANATIONS.issubset(context)
    assert "authorized" in context["how_to_protect"]


def test_learning_checks_have_one_valid_answer():
    modules = learning_modules()
    assert len(modules) >= 4
    for module in modules:
        check = module["check"]
        assert 0 <= check["correct_index"] < len(check["options"])
        assert module["steps"]
        assert module["objectives"]


def test_education_api_exposes_modules_and_not_found():
    topics = get_learning_modules()
    assert get_learning_module(topics[0]["id"])["id"] == topics[0]["id"]
    with pytest.raises(HTTPException) as exc_info:
        get_learning_module("not-a-topic")
    assert exc_info.value.status_code == 404
