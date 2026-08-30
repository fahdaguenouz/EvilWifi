from dataclasses import dataclass


@dataclass
class AuthorizationState:
    confirmed: bool = False
    network_owner_confirmed: bool = False
    scope_confirmed: bool = False


authorization_state = AuthorizationState()


def is_authorized() -> bool:
    return (
        authorization_state.confirmed
        and authorization_state.network_owner_confirmed
        and authorization_state.scope_confirmed
    )