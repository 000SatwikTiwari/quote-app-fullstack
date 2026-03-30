#run:
# cd Mini_SocialMedia
#  uvicorn APILAB:app --reload
 

#imports 
from bson import ObjectId
from fastapi import FastAPI, Depends, HTTPException, APIRouter
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from pymongo import MongoClient
import random
import smtplib
from email.mime.text import MIMEText
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt, JWTError
from enum import Enum
from fastapi import BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware


#Formals
load_dotenv()
app = FastAPI()
router = APIRouter(prefix="/api")
security = HTTPBearer()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


#ENV variables
MONGO_URL = os.getenv("MONGO_URL")
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7


#DB
client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
dbQ = client["QuotesAPP"]           #database for quote app

users = dbQ["users"] # all useres registered
pending = dbQ["pending_users"] #temporary 
refresh_tokens = dbQ["refresh_tokens"]
follows = dbQ["follows"]
quotes = dbQ["quotes"]
likes = dbQ["likes"]
comments = dbQ["comments"]
notifications = dbQ["notifications"]




# ----------------Pydentic/enum MODELS ----------------
#enum
class ReactionType(str, Enum):
    like = "like"
    dislike = "dislike"
class Register(BaseModel):
    email: str
    password: str
    full_name: str
class VerifyOTP(BaseModel):
    email: str
    otp: str
class ResendOTP(BaseModel):
    email: str
class Login(BaseModel):
    email: str
    password: str
class ChangePassword(BaseModel):
    old_password: str
    new_password: str
class LikeRequest(BaseModel):
    quote_id: str
    action: ReactionType = ReactionType.like   # default = like
class ForgotPassword(BaseModel):
    email: str
    new_password: str
class RefreshTokenRequest(BaseModel):
    refresh_token: str
class EditQuote(BaseModel):
    quote_id: str
    new_content: str
class DeleteQuote(BaseModel):
    quote_id: str



# ---------------- HELPERS functions----------------
def validate_password(password:str):
    if len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters"
        )
    
def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(receiver_email, otp):
    msg = MIMEText(f"Your OTP for recent activity on QuoteAPP is {otp} , will expire in 5 minutes")
    msg["Subject"] = "QuoteAPP"
    msg["From"] = EMAIL_USER
    msg["To"] = receiver_email
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(EMAIL_USER, EMAIL_PASS)
    server.sendmail(EMAIL_USER, receiver_email, msg.as_string())
    server.quit()

def hash_password(password: str):
    return pwd.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd.verify(plain_password, hashed_password)


def create_notification(to_user, message, type_):
    notifications.insert_one({
        "to_user": to_user,
        "message": message,
        "type": type_,
        "is_read": False,
        "created_at": datetime.utcnow()
    })


# -------- CREATE JWT TOKEN --------
def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token


# -------- GET CURRENT USER --------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    session = refresh_tokens.find_one({"email": email})
    if not session:
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")
    if datetime.utcnow() > session["expires_at"]:
        refresh_tokens.delete_many({"email": email})
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")

    return user


#Routes:

@router.get("/")
def read_root():
    return {"Status": "Backend is Online!"}


# ---------------- REGISTER ----------------
@router.post("/register")
def register(user:Register):    
    validate_password(user.password)
    if users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    otp = generate_otp()
    send_otp_email(user.email, otp)
    pending.insert_one({
        "email": user.email,
        "password": hash_password(user.password),
        "name":user.full_name,
        "otp": otp,
        "full_name" : user.full_name,
        "otp_expiry": datetime.utcnow() + timedelta(minutes=5),
        "type": "register"  
    })
    return {"msg": "OTP sent to email"}


# ---------------- VERIFY OTP (COMMON) ----------------
@router.post("/verify-otp")
def verify_otp(data: VerifyOTP):
    user = pending.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="Fill All Fields")
    if datetime.utcnow() > user["otp_expiry"]:
        raise HTTPException(status_code=400, detail="OTP expired. Please resend OTP")
    if user["otp"] != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if user["type"] == "register":
        users.insert_one({
            "email": user["email"],
            "password": user["password"],
            "full_name": user["full_name"],
            "followers_count": 0,
            "following_count": 0,
            "created_at": datetime.utcnow()
        })
        pending.delete_one({"_id": user["_id"]})
        return {"msg": "User registered successfully"}
    
    elif user["type"] == "forgot_password":
        users.update_one(
            {"email": user["email"]},
            {"$set": {"password": user["new_password"]}}
        )
        pending.delete_one({"_id": user["_id"]})
        return {"msg": "Password changed successfully. You can login now."}


# ---------------- RESEND OTP ----------------
@router.post("/resend-otp")
def resend_otp(data: ResendOTP):
    user = pending.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="Request not found")
    otp = generate_otp()
    send_otp_email(data.email, otp)
    pending.update_one(
        {"email": data.email},
        {"$set": {"otp": otp, "otp_expiry": datetime.utcnow() + timedelta(minutes=5)}}
    )
    return {"msg": "New OTP sent to email"}


# ---------------- FORGOT PASSWORD ----------------
@router.post("/forgot-password")
def forgot_password(data: ForgotPassword):
    user = users.find_one({"email": data.email})
    validate_password(data.new_password)
    if not user:
        raise HTTPException(status_code=404, detail="User not registered")
    otp = generate_otp()
    send_otp_email(data.email, otp)
    pending.insert_one({
        "email": data.email,
        "new_password": hash_password(data.new_password),
        "otp": otp,
        "otp_expiry": datetime.utcnow() + timedelta(minutes=5),
        "type": "forgot_password"
    })
    return {"msg": "OTP sent for password reset"}


# ---------------- LOGIN ----------------
@router.post("/login")
def login(user: Login):
    try:
        db_user = users.find_one({"email": user.email})
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Wrong password")
        
        access_token = create_access_token({"sub": user.email})
        refresh_token = create_refresh_token({"sub": user.email})
        refresh_tokens.insert_one({
            "email": user.email,
            "token": refresh_token,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        })
        return {
            "msg": "Login success",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        # This will show us the REAL error message in the 500 response!
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")


#--------------------REFRESH ACCESS TOKEN---------------------
@router.post("/refresh-token")
def refresh_token(data: RefreshTokenRequest):
    try:
        payload = jwt.decode(data.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    stored = refresh_tokens.find_one({"email": email, "token": data.refresh_token})
    if not stored:
        raise HTTPException(status_code=401, detail="Token not recognized")

    new_access_token = create_access_token({"sub": email})
    return {"access_token": new_access_token, "token_type": "bearer"}


# ---------------- CHANGE PASSWORD ----------------
@router.post("/change-password")
def change_password(data: ChangePassword, user=Depends(get_current_user)):
    if not verify_password(data.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="Wrong old password, retry!")
    users.update_one({"email": user["email"]}, {"$set": {"password": hash_password(data.new_password)}})
    return {"msg": "Password changed successfully"}


# ----------------Delete Account ----------------
@router.delete("/delete-account")
def delete_account(user=Depends(get_current_user)):
    users.delete_one({"email": user["email"]})
    refresh_tokens.delete_many({"email": user["email"]})
    return {"msg": "Account deleted successfully"}


# ----------------Log Out ----------------
@router.post("/logout")
def logout(user=Depends(get_current_user)):
    refresh_tokens.delete_many({"email": user["email"]})
    return {"msg": "Logout successful"}


# ----------------My profile ----------------
@router.get("/my-profile")
def my_profile(user=Depends(get_current_user)):
    return {
        "email": user["email"],
        "full_name": user["full_name"],
        "followers_count": user.get("followers_count", 0),
        "following_count": user.get("following_count", 0)
    }


# ----------------Edit profile ----------------
@router.post("/edit_profile")
def EditProfile(name: str, user=Depends(get_current_user)):
    data = users.find_one({"email": user["email"]})
    temp = data["full_name"]
    users.update_one({"email": user["email"]}, {"$set": {"full_name": name}})
    return {"msg": "your name changed from : " + temp + " to " + name}


# ----------------discover-users ----------------
@router.get("/discover-users")
def discover_users(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    user=Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {
        "email": {"$ne": user["email"]},
        "full_name": {"$regex": search, "$options": "i"}
    }
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
    pipeline = [
        {"$addFields": {"is_today": {"$cond": [{"$gte": ["$created_at", today_start]}, 1, 0]}}},
        {"$match": query},
        {"$sort": {"is_today": -1, "created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$project": {"_id": 0, "email": 1, "full_name": 1, "followers_count": 1}}
    ]
    users_list = list(users.aggregate(pipeline))
    return {"page": page, "limit": limit, "users": users_list}


# -----------------Follow users ----------------
@router.post("/follow")
def follow_user(target_email: str, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    if target_email == user["email"]:
        raise HTTPException(400, "You cannot follow yourself")
    target = users.find_one({"email": target_email})
    if not target:
        raise HTTPException(404, "User not found")
    existing = follows.find_one({"follower": user["email"], "following": target_email})
    if existing:
        raise HTTPException(400, "Already following")
    follows.insert_one({"follower": user["email"], "following": target_email, "created_at": datetime.utcnow()})
    users.update_one({"email": target_email}, {"$inc": {"followers_count": 1}})
    users.update_one({"email": user["email"]}, {"$inc": {"following_count": 1}})
    background_tasks.add_task(create_notification, target_email, f"{user['full_name']} followed you", "follow")
    return {"msg": "Followed successfully"}


# -----------------CREATE QUOTE ----------------
@router.post("/create-quote")
def create_quote(content: str, user=Depends(get_current_user)):
    quotes.insert_one({
        "email": user["email"],
        "full_name": user["full_name"],
        "content": content,
        "created_at": datetime.utcnow(),
        "likes_count": 0,
        "dislikes_count": 0
    })
    return {"msg": "Quote created"}


# -----------------my-posts" ---------------
@router.get("/my-posts")
def my_posts(user=Depends(get_current_user)):
    user_quotes = list(quotes.find({"email": user["email"]}))
    result = []
    for q in user_quotes:
        q_id = str(q["_id"])
        like_users = list(likes.find({"quote_id": q_id, "type": "like"}))
        like_names = []
        for l in like_users:
            u = users.find_one({"email": l["user_email"]})
            if u:
                like_names.append(u["full_name"])
        comment_data = list(comments.find({"quote_id": q_id}))
        comments_list = []
        for c in comment_data:
            comments_list.append({"name": c["full_name"], "comment": c["comment"]})
        result.append({
            "quote_id": q_id,
            "content": q["content"],
            "likes_count": q.get("likes_count", 0),
            "dislikes_count": q.get("dislikes_count", 0),
            "liked_by": like_names,
            "comments": comments_list,
            "created_at": q.get("created_at", datetime.utcnow()).isoformat() if q.get("created_at") else None
        })
    return {"my_posts": result}


# -----------------LIKE / DISLIKE ----------------
@router.post("/like")
def like_quote(data: LikeRequest, background_tasks: BackgroundTasks, user=Depends(get_current_user)):
    quote_id = data.quote_id
    action = data.action.value

    if action not in ["like", "dislike"]:
        raise HTTPException(400, "Action must be like or dislike")

    quote = quotes.find_one({"_id": ObjectId(quote_id)})
    if not quote:
        raise HTTPException(404, "Quote not found")

    existing = likes.find_one({"user_email": user["email"], "quote_id": quote_id})

    if not existing:
        likes.insert_one({"user_email": user["email"], "quote_id": quote_id, "type": action})
        if action == "like":
            quotes.update_one({"_id": ObjectId(quote_id)}, {"$inc": {"likes_count": 1}})
        else:
            quotes.update_one({"_id": ObjectId(quote_id)}, {"$inc": {"dislikes_count": 1}})
        return {"msg": f"{action} added"}

    if existing["type"] == action:
        likes.delete_one({"_id": existing["_id"]})
        if action == "like":
            quotes.update_one({"_id": ObjectId(quote_id)}, {"$inc": {"likes_count": -1}})
        else:
            quotes.update_one({"_id": ObjectId(quote_id)}, {"$inc": {"dislikes_count": -1}})
        return {"msg": f"{action} removed"}

    else:
        likes.update_one({"_id": existing["_id"]}, {"$set": {"type": action}})
        if action == "like":
            quotes.update_one({"_id": ObjectId(quote_id)}, {"$inc": {"likes_count": 1, "dislikes_count": -1}})
        else:
            quotes.update_one({"_id": ObjectId(quote_id)}, {"$inc": {"likes_count": -1, "dislikes_count": 1}})

        quote = quotes.find_one({"_id": ObjectId(quote_id)})   
        if action == "like":
            background_tasks.add_task(create_notification, quote["email"], f"{user['full_name']} liked your post: {quote['content']}", "like") 
        return {"msg": f"Changed to {action}"}


# -----------------Comment ----------------
@router.post("/comment")
def add_comment(quote_id: str, background_tasks: BackgroundTasks, comment: str, user=Depends(get_current_user)):
    comments.insert_one({
        "quote_id": quote_id,
        "user_email": user["email"],
        "full_name": user["full_name"],
        "comment": comment,
        "created_at": datetime.utcnow()
    })
    quote = quotes.find_one({"_id": ObjectId(quote_id)})
    background_tasks.add_task(create_notification, quote["email"], f"{user['full_name']} commented: {comment}", "comment")
    return {"msg": "Comment added"}


# ---------------- FEED ----------------
@router.get("/feed")
def get_feed(
    page: int = 1,
    limit: int = 10,
    user=Depends(get_current_user)
):
    skip = (page - 1) * limit
    following_data = follows.find({"follower": user["email"]})
    following_emails = [f["following"] for f in following_data]
    followers_data = follows.find({"following": user["email"]})
    follower_emails = [f["follower"] for f in followers_data]
    allowed_users = list(set(following_emails + follower_emails + [user["email"]]))

    posts = list(
        quotes.find({"email": {"$in": allowed_users}})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )

    result = []
    for p in posts:
        q_id = str(p["_id"])
        comments_count = comments.count_documents({"quote_id": q_id})
        result.append({
            "quote_id": q_id,
            "content": p["content"],
            "posted_by": p["full_name"],
            "email": p["email"],
            "likes_count": p.get("likes_count", 0),
            "comments_count": comments_count,
            "created_at": p["created_at"].isoformat() if p.get("created_at") else None
        })

    return {"page": page, "limit": limit, "posts": result}


#---------------------My Followers----------------------
@router.get("/my-followers")
def my_followers(user=Depends(get_current_user)):
    followers_data = list(follows.find({"following": user["email"]}))
    result = []
    for f in followers_data:
        follower_user = users.find_one({"email": f["follower"]})
        if follower_user:
            result.append({"email": follower_user["email"], "full_name": follower_user["full_name"]})
    return {"total_followers": len(result), "followers": result}


#---------------------Following----------------------
@router.get("/my-following")
def my_following(user=Depends(get_current_user)):
    following_data = list(follows.find({"follower": user["email"]}))
    result = []
    for f in following_data:
        following_user = users.find_one({"email": f["following"]})
        if following_user:
            result.append({"email": following_user["email"], "full_name": following_user["full_name"]})
    return {"total_following": len(result), "following": result}


@router.get("/my-notifications")
def get_notifications(user=Depends(get_current_user)):
    data = list(notifications.find({"to_user": user["email"]}).sort("created_at", -1))
    result = []
    for n in data:
        result.append({
            "message": n["message"],
            "type": n["type"],
            "is_read": n["is_read"],
            "time": n["created_at"].isoformat() if n.get("created_at") else None
        })
    return {"notifications": result}


#---------------------Edit-quote----------------------
@router.put("/edit-quote")
def edit_quote(data: EditQuote, user=Depends(get_current_user)):
    quote = quotes.find_one({"_id": ObjectId(data.quote_id)})
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote["email"] != user["email"]:
        raise HTTPException(403, "Not authorized")
    quotes.update_one(
        {"_id": ObjectId(data.quote_id)},
        {"$set": {"content": data.new_content, "updated_at": datetime.utcnow()}}
    )
    return {"msg": "Quote updated successfully"}


# -----------------UNFOLLOW----------------
@router.post("/unfollow")
def unfollow_user(target_email: str, user=Depends(get_current_user)):
    if target_email == user["email"]:
        raise HTTPException(400, "You cannot unfollow yourself")
    existing = follows.find_one({"follower": user["email"], "following": target_email})
    if not existing:
        raise HTTPException(400, "You are not following this user")
    follows.delete_one({"_id": existing["_id"]})
    users.update_one({"email": target_email}, {"$inc": {"followers_count": -1}})
    users.update_one({"email": user["email"]}, {"$inc": {"following_count": -1}})
    return {"msg": "Unfollowed successfully"}


# -----------------DELETE QUOTE----------------
@router.delete("/delete-quote")
def delete_quote(data: DeleteQuote, user=Depends(get_current_user)):
    quote = quotes.find_one({"_id": ObjectId(data.quote_id)})
    if not quote:
        raise HTTPException(404, "Quote not found")
    if quote["email"] != user["email"]:
        raise HTTPException(403, "Not authorized")
    quotes.delete_one({"_id": ObjectId(data.quote_id)})
    likes.delete_many({"quote_id": data.quote_id})
    comments.delete_many({"quote_id": data.quote_id})
    return {"msg": "Quote deleted successfully"}


# Include router
app.include_router(router)
