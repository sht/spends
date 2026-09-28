from datetime import date, timedelta
from httpx import AsyncClient


async def _create_purchase(client: AsyncClient, name: str, warranty_expiry: date, **extra) -> dict:
    response = await client.post("/api/purchases/", json={
        "product_name": name,
        "price": "10.00",
        "purchase_date": (date.today() - timedelta(days=400)).isoformat(),
        "warranty_expiry": warranty_expiry.isoformat(),
        **extra,
    })
    assert response.status_code == 201, response.text
    return response.json()


async def test_expiring_route_is_reachable_and_filters_by_days(test_client: AsyncClient):
    soon = await _create_purchase(test_client, "Expiring Soon Item", date.today() + timedelta(days=10))
    await _create_purchase(test_client, "Expiring Later Item", date.today() + timedelta(days=200))

    response = await test_client.get("/api/warranties/expiring", params={"days": 30})

    assert response.status_code == 200
    purchase_ids = [w["purchase_id"] for w in response.json()]
    assert soon["id"] in purchase_ids
    assert all(date.fromisoformat(w["warranty_end"]) <= date.today() + timedelta(days=30) for w in response.json())


async def test_status_is_derived_from_end_date_not_stored_value(test_client: AsyncClient):
    purchase = await _create_purchase(test_client, "Stale Status Item", date.today() + timedelta(days=5))
    warranty_id = purchase["warranty_id"]

    # Move the end date into the past while leaving the stored status as ACTIVE.
    response = await test_client.put(f"/api/warranties/{warranty_id}", json={
        "warranty_end": (date.today() - timedelta(days=1)).isoformat(),
        "status": "ACTIVE",
    })
    assert response.status_code == 200

    assert (await test_client.get(f"/api/warranties/{warranty_id}")).json()["status"] == "EXPIRED"
    purchase = (await test_client.get(f"/api/purchases/{purchase['id']}/")).json()
    assert purchase["warranty"]["status"] == "EXPIRED"


async def test_search_matches_serial_number_and_notes(test_client: AsyncClient):
    await _create_purchase(
        test_client, "Search Target", date.today() + timedelta(days=100),
        serial_number="SN-UNIQUE-4242", notes="bought for the balcony",
    )

    by_serial = (await test_client.get("/api/purchases/", params={"search": "UNIQUE-4242"})).json()
    by_notes = (await test_client.get("/api/purchases/", params={"search": "balcony"})).json()

    assert [p["product_name"] for p in by_serial["items"]] == ["Search Target"]
    assert [p["product_name"] for p in by_notes["items"]] == ["Search Target"]
