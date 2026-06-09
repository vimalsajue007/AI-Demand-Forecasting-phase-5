import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.core.security import get_current_user
from app.core.roles import require_permission
from app.core.config import settings
from app.services.data_processor import process_dataset, validate_file
from app.services.activity_service import log_activity
from app.core.cache import invalidate_pattern

router = APIRouter(prefix="/api/datasets", tags=["Datasets"])


def _process_dataset_task(dataset_id: int, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            return
        metadata = process_dataset(dataset.file_path)
        dataset.rows_count = metadata["rows_count"]
        dataset.columns = metadata["columns"]
        dataset.status = "processed"
        db.commit()
        invalidate_pattern(db, f"dashboard:{dataset.owner_id}")
    except Exception as e:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset:
            dataset.status = "error"
            db.commit()
    finally:
        db.close()


@router.post("/upload")
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    name: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("upload_datasets")),
):
    # Secure file validation
    file_content = await file.read()
    file_size = len(file_content)
    is_valid, error_msg = validate_file(file.filename, file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_filename = f"{current_user.id}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(file_content)

    dataset = Dataset(
        name=name, filename=file.filename, file_path=file_path,
        owner_id=current_user.id, status="uploaded",
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    log_activity(db, "dataset_uploaded", user_id=current_user.id, resource="dataset", resource_id=dataset.id)
    background_tasks.add_task(_process_dataset_task, dataset.id, settings.DATABASE_URL)

    return {
        "id": dataset.id, "name": dataset.name, "filename": dataset.filename,
        "status": dataset.status, "created_at": str(dataset.created_at),
    }


@router.get("/")
def list_datasets(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Dataset).filter(Dataset.owner_id == current_user.id)
    if search:
        query = query.filter(Dataset.name.contains(search))
    if status:
        query = query.filter(Dataset.status == status)
    total = query.count()
    datasets = query.order_by(Dataset.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "total": total,
        "datasets": [
            {"id": d.id, "name": d.name, "filename": d.filename, "rows_count": d.rows_count,
             "status": d.status, "created_at": str(d.created_at)[:10]}
            for d in datasets
        ],
    }


@router.get("/{dataset_id}")
def get_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {
        "id": dataset.id, "name": dataset.name, "filename": dataset.filename,
        "rows_count": dataset.rows_count, "status": dataset.status,
        "columns": dataset.columns, "created_at": str(dataset.created_at),
    }


@router.get("/{dataset_id}/preview")
def preview_dataset(dataset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if dataset.status != "processed":
        raise HTTPException(status_code=400, detail="Dataset not processed yet")

    from app.services.data_processor import load_dataset
    df = load_dataset(dataset.file_path)
    return {
        "columns": list(df.columns),
        "preview": df.head(10).fillna("").to_dict(orient="records"),
        "shape": {"rows": len(df), "cols": len(df.columns)},
        "dtypes": {col: str(df[col].dtype) for col in df.columns},
    }


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("delete_datasets")),
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)
    db.delete(dataset)
    db.commit()
    log_activity(db, "dataset_deleted", user_id=current_user.id, resource="dataset", resource_id=dataset_id)
    return {"message": "Dataset deleted"}
