from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import admin, applications, athletes, me

app = FastAPI(title="Cancha Propia API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)
app.include_router(athletes.router)
app.include_router(admin.router)
app.include_router(me.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
