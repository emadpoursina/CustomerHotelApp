"""Bale notification message builder (contracts/bale-message.md).

Builds the 5-line notification message sent to hotel management via Bale.
Comments are strictly excluded from the message payload.
"""

DEPT_MAP_FA = {
    "restaurant": "رستوران",
    "reception": "پذیرش",
    "facilities": "تاسیسات",
    "housekeeping": "خانه‌داری",
}

DEFAULT_HOTEL_FA = "مجتمع کوثر ملکشهر"
DEFAULT_WHEN_FA = "اکنون"


def build_bale_message(
    department: str,
    hotel_fa: str = DEFAULT_HOTEL_FA,
    when_fa: str = DEFAULT_WHEN_FA,
) -> str:
    """Build the 3-line Persian text for Bale.

    Signature allows ONLY department, hotel_fa, when_fa.
    No comment, overall, or nps parameter exists.
    """
    dept_fa = DEPT_MAP_FA.get(department, department or "عمومی")
    return (
        f"بازخورد جدید · {dept_fa}\n"
        f"{hotel_fa}\n"
        f"{when_fa}"
    )
