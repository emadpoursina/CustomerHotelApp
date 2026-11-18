"""Queue item state machine (spec 003, data-model.md §3).

Documented transitions:
  pending + publish   -> published
  pending + private   -> private
  published + private -> private
  published + publish -> rejected (not_pending)
  private + publish   -> rejected (private_terminal)
  private + private   -> private (no-op)
  any -> pending      -> forbidden (no return to pending)
"""

STATES = ("pending", "published", "private")
ACTIONS = ("publish", "private")


class InvalidTransitionError(Exception):
    def __init__(self, code: str, message: str = ""):
        super().__init__(message or code)
        self.code = code


def can_transition(current_state: str, action: str) -> bool:
    if current_state not in STATES or action not in ACTIONS:
        return False
    if current_state == "pending":
        return action in ("publish", "private")
    if current_state == "published":
        return action == "private"
    if current_state == "private":
        # private is terminal for publication, private+private is a no-op
        return action == "private"
    return False


def transition(current_state: str, action: str) -> str:
    """Return the next state, or raise InvalidTransitionError with the contract error code."""
    if current_state not in STATES:
        raise InvalidTransitionError("invalid_state", f"Unknown state: {current_state}")
    if action not in ACTIONS:
        raise InvalidTransitionError("invalid_action", f"Unknown action: {action}")

    if current_state == "pending":
        if action == "publish":
            return "published"
        if action == "private":
            return "private"

    if current_state == "published":
        if action == "publish":
            raise InvalidTransitionError("not_pending", "Item is already published")
        if action == "private":
            return "private"

    if current_state == "private":
        if action == "publish":
            raise InvalidTransitionError("private_terminal", "Private items cannot be published")
        if action == "private":
            return "private"

    raise InvalidTransitionError("invalid_transition", f"Cannot {action} from {current_state}")
