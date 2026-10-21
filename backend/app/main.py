from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.routes import medicines, auth, verification


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="MedGuard AI API",
    description="API for medicine verification and counterfeit medicine detection",
    version="1.0.0"
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,

    # Allows React/Vite to run on localhost ports
    # such as 5173, 5174, 5175, etc.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTES
# ============================================================

app.include_router(medicines.router)
app.include_router(auth.router)
app.include_router(verification.router)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "MedGuard AI Backend"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ============================================================
# DATABASE TEST
# ============================================================

@app.get("/db-test")
def database_test():

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT 1")
        )

        return {
            "database": "connected",
            "result": result.scalar()
        }