from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = {"schema": "order_service"}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order_items = relationship("OrderItem", back_populates="product")


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = {"schema": "order_service"}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # references user_service.users
    status = Column(String(50), default="pending")
    total_price = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = {"schema": "order_service"}

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("order_service.orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("order_service.products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
