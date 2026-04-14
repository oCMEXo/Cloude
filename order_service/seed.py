from database import engine, SessionLocal
from sqlalchemy import text
import models

with engine.connect() as conn:
    conn.execute(text("CREATE SCHEMA IF NOT EXISTS order_service"))
    conn.commit()

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    existing = db.query(models.Product).first()
    if existing:
        print("Data already seeded, skipping.")
    else:
        products = [
            models.Product(name="Laptop Pro 15", description="High-performance laptop", price=1299.99, stock=50),
            models.Product(name="Wireless Mouse", description="Ergonomic wireless mouse", price=29.99, stock=200),
            models.Product(name="USB-C Hub", description="7-in-1 USB-C hub", price=49.99, stock=150),
            models.Product(name="Mechanical Keyboard", description="RGB mechanical keyboard", price=89.99, stock=75),
            models.Product(name="Monitor 27\"", description="4K IPS monitor", price=399.99, stock=30),
        ]
        db.add_all(products)
        db.flush()

        orders = [
            models.Order(user_id=3, status="completed", total_price=1329.98),
            models.Order(user_id=4, status="pending", total_price=139.98),
            models.Order(user_id=5, status="processing", total_price=449.98),
        ]
        db.add_all(orders)
        db.flush()

        order_items = [
            models.OrderItem(order_id=orders[0].id, product_id=products[0].id, quantity=1, unit_price=1299.99),
            models.OrderItem(order_id=orders[0].id, product_id=products[1].id, quantity=1, unit_price=29.99),
            models.OrderItem(order_id=orders[1].id, product_id=products[3].id, quantity=1, unit_price=89.99),
            models.OrderItem(order_id=orders[1].id, product_id=products[2].id, quantity=1, unit_price=49.99),
            models.OrderItem(order_id=orders[2].id, product_id=products[4].id, quantity=1, unit_price=399.99),
            models.OrderItem(order_id=orders[2].id, product_id=products[2].id, quantity=1, unit_price=49.99),
        ]
        db.add_all(order_items)
        db.commit()
        print("OrderService data seeded successfully!")

finally:
    db.close()
