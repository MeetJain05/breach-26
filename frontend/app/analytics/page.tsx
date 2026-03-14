"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/lib/types";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  ListChecks,
  GitMerge,
  Zap,
  TrendingUp,
  MapPin,
  Code2,
  Briefcase,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Treemap,
} from "recharts";
import { motion } from "motion/react";

/* ── Palette ─────────────────────────────────────────────── */

const TERRA = "#C4553A";
const SAGE = "#4A8C5C";
const GOLD = "#C4903A";
const STEEL = "#6B8CA3";
const PLUM = "#8B6B99";
const UMBER = "#A0785A";
const SLATE = "#7A6B5D";
const ROSE = "#B33A3A";

const COLORS = [TERRA, SAGE, GOLD, STEEL, PLUM, UMBER, SLATE, ROSE];

const GRADIENT_PAIRS = [
  { start: "#C4553A", end: "#E8845A" },
  { start: "#4A8C5C", end: "#6DBF7B" },
  { start: "#C4903A", end: "#E8B85A" },
  { start: "#6B8CA3", end: "#8DB5CC" },
];

/* ── Animated stat card ──────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  delay = 0,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white"
        style={{ background: gradient }}
      >
        {/* Decorative circle */}
        <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
        <div className="absolute -right-2 -top-2 size-16 rounded-full bg-white/10" />

        <div className="relative z-10">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="size-5" />
          </div>
          <p className="text-sm font-medium text-white/80">{label}</p>
          <p className="mt-0.5 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-xs text-white/60">{sub}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Custom tooltip ──────────────────────────────────────── */

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/40 bg-[rgba(253,251,248,0.9)] px-3 py-2 shadow-lg backdrop-blur-xl dark:bg-[rgba(34,34,32,0.9)] dark:border-white/[0.06]">
      {label && <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || TERRA }}>
          {p.name ? `${p.name}: ` : ""}{p.value}
        </p>
      ))}
    </div>
  );
}

/* ── Custom treemap content ──────────────────────────────── */

function TreemapContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  count?: number;
  index?: number;
  depth?: number;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, count, index = 0 } = props;
  if (width < 40 || height < 30) return null;
  const color = COLORS[index % COLORS.length];
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill={color}
        fillOpacity={0.85}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={2}
      />
      {width > 55 && height > 40 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="white"
            fontSize={Math.min(13, width / 6)}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.8)"
            fontSize={Math.min(11, width / 7)}
          >
            {count}
          </text>
        </>
      )}
    </g>
  );
}

/* ── Main page ───────────────────────────────────────────── */

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    api<AnalyticsOverview>("/api/analytics/overview")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading) return null;

  /* ── Derived chart data ──────────────────────────────── */

  const pieData = data?.sources?.map((s) => ({
    name: s.source.replace(/_/g, " "),
    value: s.count,
  })) ?? [];

  const trendData = [...(data?.ingestion_trends ?? [])].reverse().map((t) => ({
    date: t.date.slice(5),
    count: t.count,
  }));

  const statusData = data?.statuses?.filter((s) => s.status !== "merged").map((s) => ({
    name: s.status.replace(/_/g, " "),
    value: s.count,
  })) ?? [];

  const skillsData = data?.top_skills?.map((s) => ({
    name: s.skill,
    count: s.count,
  })) ?? [];

  const locData = data?.top_locations?.map((l) => ({
    name: l.location?.split(",")[0] ?? l.location,
    fullName: l.location,
    count: l.count,
  })) ?? [];

  const expData = data?.experience_distribution ?? [];

  // Radar chart: top 6 skills
  const radarData = skillsData.slice(0, 6).map((s) => ({
    skill: s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
    value: s.count,
    fullMark: Math.max(...skillsData.slice(0, 6).map((x) => x.count), 1),
  }));

  // Treemap for skills
  const treemapData = skillsData.map((s, i) => ({
    name: s.name,
    count: s.count,
    size: s.count,
    fill: COLORS[i % COLORS.length],
  }));

  const STATUS_COLORS: Record<string, string> = {
    completed: SAGE,
    "needs review": ROSE,
    ingested: STEEL,
    "pending review": GOLD,
    pending: SLATE,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-[220px]">
        <Topbar />
        <main className="flex-1 p-8 glass-mesh">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-terra to-[#E8845A] text-white shadow-lg shadow-terra/20">
                <Activity className="size-5" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                  Analytics
                </h1>
                <p className="text-sm text-muted-foreground">
                  Pipeline insights & candidate intelligence
                </p>
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
              <Skeleton className="col-span-full h-72 rounded-2xl" />
              <Skeleton className="col-span-2 h-72 rounded-2xl" />
              <Skeleton className="col-span-2 h-72 rounded-2xl" />
            </div>
          ) : (
            <>
              {/* ── Stat cards row ────────────────────────────── */}
              <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Total Candidates"
                  value={data?.total_candidates ?? 0}
                  sub="Active pipeline"
                  gradient="linear-gradient(135deg, #C4553A 0%, #E8845A 100%)"
                  delay={0}
                />
                <StatCard
                  icon={ListChecks}
                  label="Shortlists"
                  value={data?.total_shortlists ?? 0}
                  sub="Created lists"
                  gradient="linear-gradient(135deg, #4A8C5C 0%, #6DBF7B 100%)"
                  delay={0.08}
                />
                <StatCard
                  icon={GitMerge}
                  label="Auto-Merged"
                  value={data?.total_merged ?? 0}
                  sub="Dedup resolved"
                  gradient="linear-gradient(135deg, #8B6B99 0%, #B08FC0 100%)"
                  delay={0.16}
                />
                <StatCard
                  icon={Zap}
                  label="Avg Confidence"
                  value={data?.avg_confidence ? `${(data.avg_confidence * 100).toFixed(0)}%` : "—"}
                  sub="Parse quality"
                  gradient="linear-gradient(135deg, #C4903A 0%, #E8B85A 100%)"
                  delay={0.24}
                />
              </div>

              {/* ── Ingestion trend (full width area chart) ──── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mb-6"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-4 text-terra" />
                      <CardTitle>Ingestion Timeline</CardTitle>
                    </div>
                    <CardDescription>Candidates added per day — last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={TERRA} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={TERRA} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "#6E6E66" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: "#6E6E66" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={<GlassTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke={TERRA}
                            strokeWidth={2.5}
                            fill="url(#trendGrad)"
                            dot={{ r: 3, fill: TERRA, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: TERRA, stroke: "#fff", strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="py-16 text-center text-sm text-muted-foreground">No ingestion data yet</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Row 2: Source donut + Status breakdown ──── */}
              <div className="mb-6 grid gap-4 lg:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Source Breakdown</CardTitle>
                      <CardDescription>Where candidates come from</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <defs>
                              {GRADIENT_PAIRS.map((g, i) => (
                                <linearGradient key={i} id={`pieGrad${i}`} x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor={g.start} />
                                  <stop offset="100%" stopColor={g.end} />
                                </linearGradient>
                              ))}
                            </defs>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={65}
                              outerRadius={105}
                              paddingAngle={4}
                              dataKey="value"
                              cornerRadius={6}
                              label={({ name, percent }: { name?: string; percent?: number }) =>
                                `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                              }
                              labelLine={{ stroke: "#B5AEA3", strokeWidth: 1 }}
                            >
                              {pieData.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={i < GRADIENT_PAIRS.length ? `url(#pieGrad${i})` : COLORS[i % COLORS.length]}
                                  stroke="rgba(255,255,255,0.4)"
                                  strokeWidth={2}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<GlassTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Pipeline Status</CardTitle>
                      <CardDescription>Current candidate statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {statusData.length > 0 ? (
                        <div className="space-y-3 pt-2">
                          {statusData.map((s, i) => {
                            const total = statusData.reduce((a, b) => a + b.value, 0);
                            const pct = total > 0 ? (s.value / total) * 100 : 0;
                            const color = STATUS_COLORS[s.name] || COLORS[i % COLORS.length];
                            return (
                              <motion.div
                                key={s.name}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + i * 0.06 }}
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="size-2.5 rounded-full"
                                      style={{ backgroundColor: color }}
                                    />
                                    <span className="capitalize">{s.name}</span>
                                  </div>
                                  <span className="tabular-nums font-medium">{s.value}</span>
                                </div>
                                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: color }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8, delay: 0.5 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                                  />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ── Row 3: Skills treemap + Radar ────────────── */}
              <div className="mb-6 grid gap-4 lg:grid-cols-5">
                <motion.div
                  className="lg:col-span-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.55 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Code2 className="size-4 text-sage" />
                        <CardTitle>Skills Landscape</CardTitle>
                      </div>
                      <CardDescription>Top skills across your talent pool</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {treemapData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <Treemap
                            data={treemapData}
                            dataKey="size"
                            aspectRatio={4 / 3}
                            content={<TreemapContent />}
                          />
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">No skill data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  className="lg:col-span-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>Skill Radar</CardTitle>
                      <CardDescription>Top 6 skill coverage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                            <PolarGrid stroke="rgba(0,0,0,0.08)" />
                            <PolarAngleAxis
                              dataKey="skill"
                              tick={{ fontSize: 11, fill: "#6E6E66" }}
                            />
                            <PolarRadiusAxis
                              tick={{ fontSize: 9, fill: "#B5AEA3" }}
                              axisLine={false}
                            />
                            <Radar
                              name="Count"
                              dataKey="value"
                              stroke={TERRA}
                              fill={TERRA}
                              fillOpacity={0.25}
                              strokeWidth={2}
                              dot={{ r: 3, fill: TERRA }}
                            />
                            <Tooltip content={<GlassTooltip />} />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* ── Row 4: Experience dist + Location bars ──── */}
              <div className="grid gap-4 lg:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.65 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Briefcase className="size-4" style={{ color: PLUM }} />
                        <CardTitle>Experience Distribution</CardTitle>
                      </div>
                      <CardDescription>Years of experience breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {expData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={expData} barCategoryGap="20%">
                            <defs>
                              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={PLUM} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={PLUM} stopOpacity={0.4} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                            <XAxis
                              dataKey="bucket"
                              tick={{ fontSize: 11, fill: "#6E6E66" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#6E6E66" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip content={<GlassTooltip />} />
                            <Bar
                              dataKey="count"
                              fill="url(#expGrad)"
                              radius={[8, 8, 0, 0]}
                              maxBarSize={60}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-4" style={{ color: STEEL }} />
                        <CardTitle>Top Locations</CardTitle>
                      </div>
                      <CardDescription>Where your candidates are based</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {locData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={locData} layout="vertical" barCategoryGap="18%">
                            <defs>
                              <linearGradient id="locGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor={STEEL} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={STEEL} stopOpacity={0.5} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                            <XAxis
                              type="number"
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#6E6E66" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 11, fill: "#6E6E66" }}
                              axisLine={false}
                              tickLine={false}
                              width={90}
                            />
                            <Tooltip content={<GlassTooltip />} />
                            <Bar
                              dataKey="count"
                              fill="url(#locGrad)"
                              radius={[0, 8, 8, 0]}
                              maxBarSize={28}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
