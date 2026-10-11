import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import ALLOWED_ORIGINS
from app.api.routes import router
from app.api.signaling import router as signaling_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("signconnect-ai")

app = FastAPI(
    title="SignConnect AI - Backend API",
    description="AI-powered accessibility platform connecting Indian Sign Language (ISL), text, and speech.",
    version="1.0.0"
)

# CORS configuration supporting multi-device local network connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(signaling_router)

@app.get("/")
def root():
    return {
        "message": "Welcome to SignConnect AI API",
        "tagline": "Every Sign. Every Voice.",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
