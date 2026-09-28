"""A saved component must be serializable for the purchase detail view."""
from datetime import date

import pytest


@pytest.mark.asyncio
async def test_component_create_and_list_serializes_timestamps(test_client):
    purchase = await test_client.post('/api/purchases/', json={
        'product_name': 'Component detail test', 'price': '100.00',
        'currency_code': 'EUR', 'purchase_date': date.today().isoformat(),
    })
    assert purchase.status_code == 201
    purchase_id = purchase.json()['id']

    created = await test_client.post('/api/components/', json={
        'name': 'Memory upgrade', 'purchase_id': purchase_id,
        'price': '25.00', 'currency_code': 'EUR',
    })
    assert created.status_code == 201
    assert created.json()['created_at']

    listed = await test_client.get(f'/api/components/{purchase_id}/')
    assert listed.status_code == 200
    assert listed.json()[0]['id'] == created.json()['id']
    assert listed.json()[0]['created_at']
