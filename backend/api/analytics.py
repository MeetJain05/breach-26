from fastapi import APIRouter, Depends
from sqlalchemy import select, func, cast, Date, case, literal
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.auth import get_current_user
from backend.core.database import get_db
from backend.models.user import User
from backend.models.candidate import Candidate, CandidateMergeHistory
from backend.models.shortlist import Shortlist
from backend.schemas.analytics import (
    AnalyticsOverview, SourceBreakdown, IngestionTrend,
    StatusBreakdown, SkillCount, LocationCount, ExperienceBucket,
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregated analytics: totals, source breakdown, ingestion trends, skills, locations."""

    # Total candidates (exclude merged)
    total_candidates_result = await db.execute(
        select(func.count(Candidate.id)).where(Candidate.ingestion_status != "merged")
    )
    total_candidates = total_candidates_result.scalar_one()

    # Total shortlists
    total_shortlists_result = await db.execute(
        select(func.count(Shortlist.id))
    )
    total_shortlists = total_shortlists_result.scalar_one()

    # Total merged (from merge history table, not ingestion_status)
    merged_result = await db.execute(
        select(func.count(CandidateMergeHistory.id))
    )
    total_merged = merged_result.scalar_one()

    # Avg confidence
    avg_conf_result = await db.execute(
        select(func.avg(Candidate.confidence_score)).where(
            Candidate.confidence_score.isnot(None),
            Candidate.ingestion_status != "merged",
        )
    )
    avg_confidence = avg_conf_result.scalar_one()

    # Candidates by source
    source_result = await db.execute(
        select(Candidate.source, func.count(Candidate.id))
        .where(Candidate.ingestion_status != "merged")
        .group_by(Candidate.source)
        .order_by(func.count(Candidate.id).desc())
    )
    sources = [
        SourceBreakdown(source=row[0], count=row[1])
        for row in source_result.all()
    ]

    # Ingestion trends (last 30 days)
    trend_result = await db.execute(
        select(
            cast(Candidate.created_at, Date).label("date"),
            func.count(Candidate.id).label("count"),
        )
        .where(Candidate.ingestion_status != "merged")
        .group_by(cast(Candidate.created_at, Date))
        .order_by(cast(Candidate.created_at, Date).desc())
        .limit(30)
    )
    trends = [
        IngestionTrend(date=str(row.date), count=row.count)
        for row in trend_result.all()
    ]

    # Status breakdown
    status_result = await db.execute(
        select(Candidate.ingestion_status, func.count(Candidate.id))
        .group_by(Candidate.ingestion_status)
        .order_by(func.count(Candidate.id).desc())
    )
    statuses = [
        StatusBreakdown(status=row[0], count=row[1])
        for row in status_result.all()
    ]

    # Top skills (unnest JSONB array, count occurrences)
    try:
        skill_result = await db.execute(
            select(
                func.jsonb_array_elements_text(Candidate.skills).label("skill"),
                func.count().label("cnt"),
            )
            .where(
                Candidate.skills.isnot(None),
                Candidate.ingestion_status != "merged",
            )
            .group_by("skill")
            .order_by(func.count().desc())
            .limit(12)
        )
        top_skills = [
            SkillCount(skill=row.skill, count=row.cnt)
            for row in skill_result.all()
        ]
    except Exception:
        top_skills = []

    # Top locations
    loc_result = await db.execute(
        select(Candidate.location, func.count(Candidate.id))
        .where(
            Candidate.location.isnot(None),
            Candidate.location != "",
            Candidate.ingestion_status != "merged",
        )
        .group_by(Candidate.location)
        .order_by(func.count(Candidate.id).desc())
        .limit(8)
    )
    top_locations = [
        LocationCount(location=row[0], count=row[1])
        for row in loc_result.all()
    ]

    # Experience distribution buckets
    exp_result = await db.execute(
        select(
            case(
                (Candidate.years_experience < 2, "0-2 yrs"),
                (Candidate.years_experience < 5, "2-5 yrs"),
                (Candidate.years_experience < 8, "5-8 yrs"),
                (Candidate.years_experience < 12, "8-12 yrs"),
                else_="12+ yrs",
            ).label("bucket"),
            func.count(Candidate.id).label("count"),
        )
        .where(
            Candidate.years_experience.isnot(None),
            Candidate.ingestion_status != "merged",
        )
        .group_by("bucket")
        .order_by("bucket")
    )
    experience_distribution = [
        ExperienceBucket(bucket=row.bucket, count=row.count)
        for row in exp_result.all()
    ]

    return AnalyticsOverview(
        total_candidates=total_candidates,
        total_shortlists=total_shortlists,
        total_merged=total_merged,
        avg_confidence=round(avg_confidence, 2) if avg_confidence else None,
        sources=sources,
        ingestion_trends=trends,
        statuses=statuses,
        top_skills=top_skills,
        top_locations=top_locations,
        experience_distribution=experience_distribution,
    )
