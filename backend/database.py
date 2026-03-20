Simple SQLite database setup - no migrations needed, just run and go

from sqlalchemy import create_engine, Column, String, Integer, BigInteger, Boolean, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import uuid

DATABASE_URL = "sqlite:///./filemanager.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    platform = Column(String)
    last_seen = Column(DateTime, default=datetime.utcnow)


class Folder(Base):
    __tablename__ = "folders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String)
    path = Column(Text)


class File(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String)
    folder_id = Column(String)
    path = Column(Text)
    filename = Column(String)
    size_bytes = Column(BigInteger)
    file_hash = Column(String)
    keep_status = Column(String, default="unreviewed")
    category = Column(String)
    location = Column(String)
    metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class Command(Base):
    __tablename__ = "commands"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = Column(String)
    command_type = Column(String)
    target_files = Column(JSON)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
