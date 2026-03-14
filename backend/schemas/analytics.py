from __future__ import annotations

from pydantic import BaseModel


class SourceBreakdown(BaseModel):
    source: str
    count: int


class IngestionTrend(BaseModel):
    date: str
    count: int


class StatusBreakdown(BaseModel):
    status: str
    count: int


class SkillCount(BaseModel):
    skill: str
    count: int


class LocationCount(BaseModel):
    location: str
    count: int


class ExperienceBucket(BaseModel):
    bucket: str
    count: int


class AnalyticsOverview(BaseModel):
    total_candidates: int
    total_shortlists: int
    total_merged: int
    avg_confidence: float | None
    sources: list[SourceBreakdown]
    ingestion_trends: list[IngestionTrend]
    statuses: list[StatusBreakdown]
    top_skills: list[SkillCount]
    top_locations: list[LocationCount]
    experience_distribution: list[ExperienceBucket]
