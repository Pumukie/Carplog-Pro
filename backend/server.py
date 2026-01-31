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
    # Personal Info
    name: Optional[str] = None
    surname: Optional[str] = None
    age: Optional[int] = None
    years_angling: Optional[int] = None
    bio: Optional[str] = None
    
    # Gear Setup
    rods: Optional[str] = None
    reels: Optional[str] = None
    alarms: Optional[str] = None
    bobbins: Optional[str] = None
    rod_pod_banksticks: Optional[str] = None
    bivvy_brolly: Optional[str] = None
    baitboat: Optional[str] = None
    net_and_mat: Optional[str] = None
    
    # Line Setup
    mainline: Optional[str] = None
    mainline_breaking_strain: Optional[str] = None
    hooklink: Optional[str] = None
    hooklink_breaking_strain: Optional[str] = None
    
    # Preferences
    favorite_brands: Optional[str] = None
    favorite_bait_company: Optional[str] = None
    favorite_rigs: Optional[str] = None
    favorite_baits: Optional[str] = None
    
    # Fishing Locations
    home_waters: Optional[str] = None
    favorite_venues: Optional[str] = None
    pb_weight: Optional[float] = None
    pb_weight_unit: Optional[str] = "kg"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

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
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user with empty profile
    initial_profile = UserProfile(name=user_data.name)
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        profile=initial_profile
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

# Catch Routes (with optional authentication)
@api_router.post("/catches", response_model=Catch, status_code=status.HTTP_201_CREATED)
async def create_catch(catch_input: CatchCreate, current_user: dict = Depends(get_current_user)):
    """Log a new catch"""
    catch_dict = catch_input.model_dump(exclude_unset=True)
    
    if 'caught_at' in catch_dict and catch_dict['caught_at'] is None:
        del catch_dict['caught_at']
    
    catch_obj = Catch(**catch_dict, user_id=current_user["id"])
    
    doc = catch_obj.model_dump()
    doc['caught_at'] = doc['caught_at'].isoformat()
    
    await db.catches.insert_one(doc)
    return catch_obj

@api_router.get("/catches", response_model=List[Catch])
async def get_catches(
    year: Optional[int] = None,
    month: Optional[int] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """Get user's catches"""
    query = {"user_id": current_user["id"]}
    
    if year or month:
        if year and month:
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
            query['caught_at'] = {
                '$gte': start_date.isoformat(),
                '$lt': end_date.isoformat()
            }
        elif year:
            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            query['caught_at'] = {
                '$gte': start_date.isoformat(),
                '$lt': end_date.isoformat()
            }
    
    catches = await db.catches.find(query, {"_id": 0}).sort('caught_at', -1).to_list(limit)
    
    for catch in catches:
        if isinstance(catch['caught_at'], str):
            catch['caught_at'] = datetime.fromisoformat(catch['caught_at'])
    
    return catches

@api_router.delete("/catches/{catch_id}")
async def delete_catch(catch_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a catch"""
    result = await db.catches.delete_one({"id": catch_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catch not found")
    return {"message": "Catch deleted successfully"}

@api_router.get("/stats/monthly", response_model=List[MonthlyStats])
async def get_monthly_stats(year: int, current_user: dict = Depends(get_current_user)):
    """Get monthly statistics for user"""
    start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
    end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    
    catches = await db.catches.find({
        'user_id': current_user["id"],
        'caught_at': {
            '$gte': start_date.isoformat(),
            '$lt': end_date.isoformat()
        }
    }, {"_id": 0}).to_list(10000)
    
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
async def get_yearly_stats(current_user: dict = Depends(get_current_user)):
    """Get yearly statistics for user"""
    catches = await db.catches.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(10000)
    
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

# Analytics Models
class AnalyticsEvent(BaseModel):
    event_type: str  # 'visit', 'install', 'page_view', 'catch_logged'
    page: Optional[str] = None
    device_type: Optional[str] = None
    user_agent: Optional[str] = None

class AnalyticsResponse(BaseModel):
    total_visits: int
    unique_visitors: int
    total_installs: int
    catches_logged: int
    page_views: dict
    device_breakdown: dict
    daily_visits: list

# Analytics Routes
@api_router.post("/analytics/track")
async def track_event(event: AnalyticsEvent):
    """Track an analytics event"""
    visitor_id = str(uuid.uuid4())  # In real app, would use cookie/fingerprint
    
    doc = {
        "event_type": event.event_type,
        "page": event.page,
        "device_type": event.device_type,
        "user_agent": event.user_agent,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "visitor_id": visitor_id
    }
    
    await db.analytics.insert_one(doc)
    return {"status": "tracked"}

@api_router.get("/analytics/stats", response_model=AnalyticsResponse)
async def get_analytics_stats(current_user: dict = Depends(get_current_user)):
    """Get analytics statistics (admin only for now)"""
    
    # Get all analytics events
    events = await db.analytics.find({}, {"_id": 0}).to_list(100000)
    
    total_visits = len([e for e in events if e.get('event_type') == 'visit'])
    unique_visitors = len(set([e.get('visitor_id') for e in events if e.get('visitor_id')]))
    total_installs = len([e for e in events if e.get('event_type') == 'install'])
    catches_logged = len([e for e in events if e.get('event_type') == 'catch_logged'])
    
    # Page views breakdown
    page_views = {}
    for e in events:
        if e.get('event_type') == 'page_view' and e.get('page'):
            page = e['page']
            page_views[page] = page_views.get(page, 0) + 1
    
    # Device breakdown
    device_breakdown = {}
    for e in events:
        device = e.get('device_type', 'unknown')
        device_breakdown[device] = device_breakdown.get(device, 0) + 1
    
    # Daily visits (last 30 days)
    daily_visits = []
    today = datetime.now(timezone.utc).date()
    for i in range(30):
        day = today - timedelta(days=i)
        day_str = day.isoformat()
        count = len([e for e in events if e.get('timestamp', '').startswith(day_str) and e.get('event_type') == 'visit'])
        daily_visits.append({"date": day_str, "visits": count})
    
    daily_visits.reverse()
    
    return AnalyticsResponse(
        total_visits=total_visits,
        unique_visitors=unique_visitors,
        total_installs=total_installs,
        catches_logged=catches_logged,
        page_views=page_views,
        device_breakdown=device_breakdown,
        daily_visits=daily_visits
    )

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