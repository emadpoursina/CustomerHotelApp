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
    overall: int,
    nps: int,
    hotel_fa: str = DEFAULT_HOTEL_FA,
    when_fa: str = DEFAULT_WHEN_FA,
) -> str:
    """Build the exact 5-line Persian text for Bale.

    Signature allows ONLY department, overall, nps, hotel_fa, when_fa.
    No comment parameter exists.
    """
    dept_fa = DEPT_MAP_FA.get(department, department or "عمومی")
    return (
        f"بازخورد جدید · {dept_fa}\n"
        f"امتیاز کلی: {int(overall)}/5\n"
        f"NPS: {int(nps)}\n"
        f"{hotel_fa}\n"
        f"{when_fa}"
    )
