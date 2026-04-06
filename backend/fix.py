from app.core.database import SessionLocal
from app.models.models import User
db = SessionLocal()
db.query(User).delete()
db.commit()
print("WIPED USERS")
