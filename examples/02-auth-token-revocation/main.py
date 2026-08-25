import time
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

app = FastAPI()
security = HTTPBearer()

# In-memory blacklist for revoked tokens
REVOKED_TOKENS = set()
TOKEN_BURST_CACHE = {}

SECRET_KEY = "super-secret-key"
ALGORITHM = "HS256"

@app.post("/auth/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    REVOKED_TOKENS.add(token)
    return {"message": "Successfully logged out"}

@app.get("/api/v1/resource")
async def get_secure_resource(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    
    if token in REVOKED_TOKENS:
        raise HTTPException(status_code=401, detail="Token has been revoked")

    # Local sliding window rate limiter (100 req / minute)
    now = time.time()
    user_requests = TOKEN_BURST_CACHE.get(token, [])
    user_requests = [t for t in user_requests if now - t < 60]
    
    if len(user_requests) >= 100:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    user_requests.append(now)
    TOKEN_BURST_CACHE[token] = user_requests

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"data": "confidential_payload", "user": payload.get("sub")}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")