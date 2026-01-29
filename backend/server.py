from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import base64
from collections import defaultdict
from passlib.context import CryptContext
from jose import JWTError, jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Security Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Carplog-Pro API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password utilities
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise credentials_exception
    return user

# User Models
class UserProfile(BaseModel):
    name: str
    age: Optional[int] = None
    years_angling: Optional[int] = None
    favorite_brands: Optional[str] = None
    rods: Optional[str] = None
    reels: Optional[str] = None
    alarms: Optional[str] = None
    bobbins: Optional[str] = None
    rod_pod_banksticks: Optional[str] = None
    bivvy_brolly: Optional[str] = None
    locations_fished: Optional[str] = None
    favorite_venues: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    profile: UserProfile

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    hashed_password: str
    profile: UserProfile
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    profile: UserProfile
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

# Catch Models
class Catch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    fish_name: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: str = "kg"
    length: Optional[float] = None
    venue: Optional[str] = None
    peg_number: Optional[str] = None
    wraps_count: Optional[int] = None
    bait_used: Optional[str] = None
    photo_base64: Optional[str] = None
    caught_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

class CatchCreate(BaseModel):
    fish_name: Optional[str] = None
    weight: Optional[float] = None
    weight_unit: str = "kg"
    length: Optional[float] = None
    venue: Optional[str] = None
    peg_number: Optional[str] = None
    wraps_count: Optional[int] = None
    bait_used: Optional[str] = None
    photo_base64: Optional[str] = None
    caught_at: Optional[datetime] = None
    notes: Optional[str] = None

class MonthlyStats(BaseModel):
    month: int
    year: int
    total_count: int
    total_weight: float
    average_weight: float
    biggest_catch: Optional[dict] = None

class YearlyStats(BaseModel):
    year: int
    total_count: int
    total_weight: float
    average_weight: float
    biggest_catch: Optional[dict] = None

# Authentication Routes
@api_router.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user with comprehensive profile"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        profile=user_data.profile
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        profile=user.profile,
        created_at=user.created_at
    )

@api_router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login and get access token"""
    user = await db.users.find_one({"email": form_data.username}, {"_id": 0})
    
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        profile=UserProfile(**current_user["profile"]),
        created_at=datetime.fromisoformat(current_user["created_at"])
    )

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_profile(profile_update: UserProfile, current_user: dict = Depends(get_current_user)):
    """Update user profile"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"profile": profile_update.model_dump()}}
    )
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    return UserResponse(
        id=updated_user["id"],
        email=updated_user["email"],
        profile=UserProfile(**updated_user["profile"]),
        created_at=datetime.fromisoformat(updated_user["created_at"])
    )

# Catch Routes (Temporarily without authentication)
@api_router.post("/catches", response_model=Catch, status_code=status.HTTP_201_CREATED)
async def create_catch(catch_input: CatchCreate):
    """Log a new catch (temp: no auth required)\"\"\"\n    catch_dict = catch_input.model_dump(exclude_unset=True)\n    \n    if 'caught_at' in catch_dict and catch_dict['caught_at'] is None:\n        del catch_dict['caught_at']\n    \n    # Use a default user_id for now\n    catch_obj = Catch(**catch_dict, user_id=\"default-user\")\n    \n    doc = catch_obj.model_dump()\n    doc['caught_at'] = doc['caught_at'].isoformat()\n    \n    await db.catches.insert_one(doc)\n    return catch_obj\n\n@api_router.get(\"/catches\", response_model=List[Catch])\nasync def get_catches(\n    year: Optional[int] = None,\n    month: Optional[int] = None,\n    limit: int = 100\n):\n    \"\"\"Get all catches (temp: no auth required)\"\"\"\n    query = {}  # Get all catches for now\n    \n    if year or month:\n        if year and month:\n            start_date = datetime(year, month, 1, tzinfo=timezone.utc)\n            if month == 12:\n                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)\n            else:\n                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)\n            query['caught_at'] = {\n                '$gte': start_date.isoformat(),\n                '$lt': end_date.isoformat()\n            }\n        elif year:\n            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)\n            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)\n            query['caught_at'] = {\n                '$gte': start_date.isoformat(),\n                '$lt': end_date.isoformat()\n            }\n    \n    catches = await db.catches.find(query, {\"_id\": 0}).sort('caught_at', -1).to_list(limit)\n    \n    for catch in catches:\n        if isinstance(catch['caught_at'], str):\n            catch['caught_at'] = datetime.fromisoformat(catch['caught_at'])\n    \n    return catches\n\n@api_router.delete(\"/catches/{catch_id}\")\nasync def delete_catch(catch_id: str):\n    \"\"\"Delete a catch (temp: no auth required)\"\"\"\n    result = await db.catches.delete_one({\"id\": catch_id})\n    if result.deleted_count == 0:\n        raise HTTPException(status_code=404, detail=\"Catch not found\")\n    return {\"message\": \"Catch deleted successfully\"}\n\n@api_router.get(\"/stats/monthly\", response_model=List[MonthlyStats])\nasync def get_monthly_stats(year: int):\n    \"\"\"Get monthly statistics (temp: no auth required)\"\"\"\n    start_date = datetime(year, 1, 1, tzinfo=timezone.utc)\n    end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)\n    \n    catches = await db.catches.find({\n        'caught_at': {\n            '$gte': start_date.isoformat(),\n            '$lt': end_date.isoformat()\n        }\n    }, {\"_id\": 0}).to_list(10000)
    
    for catch in catches:
        if isinstance(catch['caught_at'], str):
            catch['caught_at'] = datetime.fromisoformat(catch['caught_at'])
    
    monthly_data = defaultdict(list)
    for catch in catches:
        month = catch['caught_at'].month
        monthly_data[month].append(catch)
    
    stats = []
    for month in range(1, 13):
        month_catches = monthly_data.get(month, [])
        # Filter catches with weight
        weighted_catches = [c for c in month_catches if c.get('weight') and c['weight'] > 0]
        
        if weighted_catches:
            total_weight = sum(c['weight'] for c in weighted_catches)
            biggest = max(weighted_catches, key=lambda x: x['weight'])
            stats.append(MonthlyStats(
                month=month,
                year=year,
                total_count=len(month_catches),
                total_weight=round(total_weight, 2),
                average_weight=round(total_weight / len(weighted_catches), 2),
                biggest_catch={
                    'id': biggest['id'],
                    'weight': biggest['weight'],
                    'fish_name': biggest.get('fish_name'),
                    'caught_at': biggest['caught_at'].isoformat()
                }
            ))
        else:
            stats.append(MonthlyStats(
                month=month,
                year=year,
                total_count=len(month_catches),
                total_weight=0.0,
                average_weight=0.0,
                biggest_catch=None
            ))
    
    return stats

@api_router.get("/stats/yearly", response_model=List[YearlyStats])
async def get_yearly_stats():
    """Get yearly statistics (temp: no auth required)"""
    catches = await db.catches.find({}, {"_id": 0}).to_list(10000)
    
    for catch in catches:
        if isinstance(catch['caught_at'], str):
            catch['caught_at'] = datetime.fromisoformat(catch['caught_at'])
    
    yearly_data = defaultdict(list)
    for catch in catches:
        year = catch['caught_at'].year
        yearly_data[year].append(catch)
    
    stats = []
    for year in sorted(yearly_data.keys(), reverse=True):
        year_catches = yearly_data[year]
        # Filter catches with weight
        weighted_catches = [c for c in year_catches if c.get('weight') and c['weight'] > 0]
        
        if weighted_catches:
            total_weight = sum(c['weight'] for c in weighted_catches)
            biggest = max(weighted_catches, key=lambda x: x['weight'])
            stats.append(YearlyStats(
                year=year,
                total_count=len(year_catches),
                total_weight=round(total_weight, 2),
                average_weight=round(total_weight / len(weighted_catches), 2),
                biggest_catch={
                    'id': biggest['id'],
                    'weight': biggest['weight'],
                    'fish_name': biggest.get('fish_name'),
                    'caught_at': biggest['caught_at'].isoformat()
                }
            ))
        else:
            stats.append(YearlyStats(
                year=year,
                total_count=len(year_catches),
                total_weight=0.0,
                average_weight=0.0,
                biggest_catch=None
            ))
    
    return stats

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()