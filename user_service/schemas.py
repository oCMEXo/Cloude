from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role_id: Optional[int] = None
    created_at: Optional[datetime] = None
    role: Optional[RoleOut] = None

    class Config:
        from_attributes = True
