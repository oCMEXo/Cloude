from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: Decimal
    stock: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderItemOut(BaseModel):
    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    user_id: int
    status: str
    total_price: Decimal
    created_at: Optional[datetime] = None
    items: Optional[List[OrderItemOut]] = []

    class Config:
        from_attributes = True
