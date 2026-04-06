import asyncio
import asyncpg
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres.upgtzchtauwovxmufugi:AnujIshu1234@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

async def clear_users():
    # Replace postgresql:// with postgres:// for asyncpg if needed
    conn = await asyncpg.connect(DATABASE_URL)
    
    # Check if users table exists
    result = await conn.execute("DELETE FROM users;")
    print(f"Deleted users: {result}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(clear_users())
