def events_url(base: str, endpoints: dict) -> str:
    return f"{base}{endpoints['events']}"


def slots_url(base: str, endpoints: dict, event_id: str) -> str:
    if endpoints["slots_query"]:
        return f"{base}{endpoints['slots']}?event_id={event_id}"
    return f"{base}/events/{event_id}/slots"
