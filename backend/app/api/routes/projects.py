from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.db.database import get_db
from app.models.user import User
from app.models.project import ForecastProject, ProjectMember, ProjectActivity
from app.core.security import get_current_user
from app.services.activity_service import log_activity

router = APIRouter(prefix="/api/projects", tags=["Forecast Workspace"])


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: Optional[list] = None
    is_shared: bool = False


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list] = None
    is_shared: Optional[bool] = None
    status: Optional[str] = None


def _add_activity(db, project_id, user_id, action, details=None):
    activity = ProjectActivity(project_id=project_id, user_id=user_id, action=action, details=details)
    db.add(activity)
    db.commit()


@router.post("/", status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    project = ForecastProject(**data.model_dump(), owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    # Add owner as member
    member = ProjectMember(project_id=project.id, user_id=current_user.id, role="owner")
    db.add(member)
    _add_activity(db, project.id, current_user.id, "Project created", {"name": project.name})
    log_activity(db, "project_created", user_id=current_user.id, resource="project", resource_id=project.id)
    return _format_project(project, db, current_user.id)


@router.get("/")
def list_projects(status: Optional[str] = None, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    query = db.query(ForecastProject).filter(ForecastProject.owner_id == current_user.id)
    if status:
        query = query.filter(ForecastProject.status == status)
    projects = query.order_by(ForecastProject.created_at.desc()).all()
    return [_format_project(p, db, current_user.id) for p in projects]


@router.get("/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    project = db.query(ForecastProject).filter(
        ForecastProject.id == project_id,
        ForecastProject.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _format_project(project, db, current_user.id)


@router.patch("/{project_id}")
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    project = db.query(ForecastProject).filter(
        ForecastProject.id == project_id, ForecastProject.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    _add_activity(db, project_id, current_user.id, "Project updated")
    return _format_project(project, db, current_user.id)


@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    project = db.query(ForecastProject).filter(
        ForecastProject.id == project_id, ForecastProject.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


@router.get("/{project_id}/activity")
def get_project_activity(project_id: int, db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    project = db.query(ForecastProject).filter(
        ForecastProject.id == project_id, ForecastProject.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    activities = db.query(ProjectActivity).filter(
        ProjectActivity.project_id == project_id
    ).order_by(ProjectActivity.created_at.desc()).limit(50).all()
    return [{"id": a.id, "action": a.action, "details": a.details,
             "user_id": a.user_id, "created_at": str(a.created_at)} for a in activities]


@router.patch("/{project_id}/archive")
def archive_project(project_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    project = db.query(ForecastProject).filter(
        ForecastProject.id == project_id, ForecastProject.owner_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "archived" if project.status == "active" else "active"
    db.commit()
    _add_activity(db, project_id, current_user.id, f"Project {project.status}")
    return {"message": f"Project {project.status}", "status": project.status}


def _format_project(project, db, user_id):
    member_count = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()
    return {
        "id": project.id, "name": project.name, "description": project.description,
        "status": project.status, "is_shared": project.is_shared, "tags": project.tags,
        "owner_id": project.owner_id, "member_count": member_count,
        "created_at": str(project.created_at), "updated_at": str(project.updated_at),
    }
