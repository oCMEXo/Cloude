from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db, engine
import models
import schemas

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Order Service", version="1.0.0")


@app.get("/")
def root():
    return {"service": "OrderService", "status": "running"}



@app.get("/products", response_model=List[schemas.ProductOut])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()


@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product



@app.get("/orders", response_model=List[schemas.OrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).all()


@app.get("/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order



@app.get("/orders/{order_id}/items", response_model=List[schemas.OrderItemOut])
def get_order_items(order_id: int, db: Session = Depends(get_db)):
    items = db.query(models.OrderItem).filter(models.OrderItem.order_id == order_id).all()
    return items
