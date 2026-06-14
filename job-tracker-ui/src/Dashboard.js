import React, { useEffect, useMemo, useState } from "react";
import API from "./api";
import AiModal from "./AiModal";
import "./App.css";

const statusOptions = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

const statusMeta = {
    Saved: { label: "Saved", accent: "#6b7280" },
    Applied: { label: "Applied", accent: "#2563eb" },
    Interview: { label: "Interview", accent: "#7c3aed" },
    Offer: { label: "Offer", accent: "#0f766e" },
    Rejected: { label: "Rejected", accent: "#b42318" }
};

const emptyForm = {
    company: "",
    role: "",
    status: "Applied",
    location: "",
    salaryRange: "",
    jobUrl: "",
    source: "",
    appliedDate: "",
    nextActionDate: "",
    contactName: "",
    contactEmail: "",
    notes: ""
};

const coachPrompts = [
    "Build my 7 day job search plan.",
    "Which roles deserve follow-up today?",
    "How should I prepare for interviews this week?"
];

function toJobContext(job) {
    return {
        company: job.company || "",
        role: job.role || "",
        status: job.status || "",
        location: job.location || "",
        salaryRange: job.salaryRange || "",
        jobUrl: job.jobUrl || "",
        source: job.source || "",
        appliedDate: job.appliedDate || "",
        nextActionDate: job.nextActionDate || "",
        contactName: job.contactName || "",
        contactEmail: job.contactEmail || "",
        notes: job.notes || ""
    };
}

function parseDate(value) {
    if (!value) {
        return null;
    }
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function daysFromToday(value) {
    const date = parseDate(value);
    if (!date) {
        return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function getPriority(job) {
    const status = job.status || "Saved";
    const daysToAction = daysFromToday(job.nextActionDate);
    const daysSinceApplied = daysFromToday(job.appliedDate);

    if (status === "Interview") {
        return { label: "Interview prep", level: "critical", score: 95 };
    }
    if (daysToAction !== null && daysToAction < 0) {
        return { label: "Overdue", level: "critical", score: 90 + Math.min(Math.abs(daysToAction), 9) };
    }
    if (daysToAction !== null && daysToAction <= 2) {
        return { label: "Due soon", level: "warning", score: 82 - daysToAction };
    }
    if (status === "Applied" && daysSinceApplied !== null && daysSinceApplied <= -7) {
        return { label: "Follow-up", level: "warning", score: 74 };
    }
    if (status === "Saved") {
        return { label: "Decide", level: "neutral", score: 58 };
    }
    return { label: "Track", level: "neutral", score: 40 };
}

function formatActionDate(value) {
    const days = daysFromToday(value);
    if (days === null) {
        return "No next action";
    }
    if (days < 0) {
        return `${Math.abs(days)}d overdue`;
    }
    if (days === 0) {
        return "Today";
    }
    if (days === 1) {
        return "Tomorrow";
    }
    return `In ${days}d`;
}

function matchesSearch(job, searchTerm) {
    if (!searchTerm.trim()) {
        return true;
    }
    const haystack = [
        job.company,
        job.role,
        job.location,
        job.source,
        job.contactName,
        job.contactEmail,
        job.notes
    ]
        .join(" ")
        .toLowerCase();
    return haystack.includes(searchTerm.trim().toLowerCase());
}

function Dashboard({ setToken }) {
    const [jobs, setJobs] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [jobPaste, setJobPaste] = useState("");
    const [resumeSummary, setResumeSummary] = useState(
        () => localStorage.getItem("resumeSummary") || ""
    );
    const [coachMessage, setCoachMessage] = useState("");
    const [coachHistory, setCoachHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [error, setError] = useState("");
    const [aiError, setAiError] = useState("");
    const [aiResult, setAiResult] = useState(null);
    const [showAiModal, setShowAiModal] = useState(false);
    const [draggedJobId, setDraggedJobId] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [viewMode, setViewMode] = useState("board");
    const [isIntakeOpen, setIsIntakeOpen] = useState(true);

    useEffect(() => {
        localStorage.setItem("resumeSummary", resumeSummary);
    }, [resumeSummary]);

    const filteredJobs = useMemo(() => {
        return jobs.filter((job) => {
            const statusMatch = selectedStatus === "All" || (job.status || "Saved") === selectedStatus;
            return statusMatch && matchesSearch(job, searchTerm);
        });
    }, [jobs, searchTerm, selectedStatus]);

    const jobsByStatus = useMemo(() => {
        return statusOptions.reduce((groups, status) => {
            groups[status] = filteredJobs.filter((job) => (job.status || "Saved") === status);
            return groups;
        }, {});
    }, [filteredJobs]);

    const focusJobs = useMemo(() => {
        return jobs
            .filter((job) => !["Offer", "Rejected"].includes(job.status || "Saved"))
            .map((job) => ({ ...job, priority: getPriority(job) }))
            .sort((a, b) => b.priority.score - a.priority.score)
            .slice(0, 8);
    }, [jobs]);

    const stats = useMemo(() => {
        const active = jobs.filter((job) => !["Offer", "Rejected"].includes(job.status || "Saved")).length;
        const interviews = jobs.filter((job) => (job.status || "Saved") === "Interview").length;
        const overdue = jobs.filter((job) => {
            const days = daysFromToday(job.nextActionDate);
            return days !== null && days < 0 && !["Offer", "Rejected"].includes(job.status || "Saved");
        }).length;
        const dueThisWeek = jobs.filter((job) => {
            const days = daysFromToday(job.nextActionDate);
            return days !== null && days >= 0 && days <= 7 && !["Offer", "Rejected"].includes(job.status || "Saved");
        }).length;
        const offers = jobs.filter((job) => (job.status || "Saved") === "Offer").length;
        const conversion = jobs.length === 0 ? 0 : Math.round(((interviews + offers) / jobs.length) * 100);

        return [
            { label: "Active", value: active, detail: `${jobs.length} total` },
            { label: "Due this week", value: dueThisWeek, detail: `${overdue} overdue` },
            { label: "Interviews", value: interviews, detail: "prep queue" },
            { label: "Signal rate", value: `${conversion}%`, detail: "interview or offer" }
        ];
    }, [jobs]);

    const loadJobs = async () => {
        try {
            setError("");
            const res = await API.get("/jobs");
            setJobs(res.data);
        } catch (err) {
            setError("Could not load jobs. Make sure the backend services are running.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadJobs();
    }, []);

    const updateForm = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value
        }));
    };

    const applyParsedJob = (parsed) => {
        setForm({
            company: parsed.company || "",
            role: parsed.role || "",
            status: parsed.status || "Saved",
            location: parsed.location || "",
            salaryRange: parsed.salaryRange || "",
            jobUrl: parsed.jobUrl || "",
            source: parsed.source || "",
            appliedDate: parsed.appliedDate || "",
            nextActionDate: parsed.nextActionDate || "",
            contactName: parsed.contactName || "",
            contactEmail: parsed.contactEmail || "",
            notes: parsed.notes || ""
        });
        setIsIntakeOpen(true);
    };

    const runAi = async (request, successHandler) => {
        try {
            setAiLoading(true);
            setAiError("");
            setShowAiModal(true);
            setAiResult(null);
            const response = await request();
            if (successHandler) {
                successHandler(response.data);
            } else {
                setAiResult(response.data);
            }
        } catch (err) {
            const message =
                err.response?.data?.error ||
                "AI request failed. Confirm ai-service is running and OPENAI_API_KEY is set.";
            setAiError(message);
        } finally {
            setAiLoading(false);
        }
    };

    const handleParseJob = async () => {
        if (!jobPaste.trim()) {
            setError("Paste a job description first.");
            return;
        }

        await runAi(
            () => API.post("/ai/parse-job", { text: jobPaste.trim() }),
            (parsed) => {
                applyParsedJob(parsed);
                setAiResult({
                    title: "Job parsed",
                    summary: parsed.matchSummary || "Structured fields were added to the intake form.",
                    bullets: parsed.suggestedSkills
                        ? [`Suggested skills: ${parsed.suggestedSkills}`]
                        : [],
                    content: "Review the extracted details, tune the next action date, then add it to your pipeline.",
                    matchScore: parsed.matchScore,
                    matchSummary: parsed.matchSummary,
                    suggestedSkills: parsed.suggestedSkills
                });
            }
        );
    };

    const handlePipelineInsights = async () => {
        await runAi(() =>
            API.post("/ai/pipeline-insights", {
                jobs: jobs.map(toJobContext)
            })
        );
    };

    const handleInterviewPrep = async (job) => {
        await runAi(() => API.post("/ai/interview-prep", toJobContext(job)));
    };

    const handleNextAction = async (job) => {
        await runAi(() => API.post("/ai/next-action", toJobContext(job)));
    };

    const handleFitPlan = async (job) => {
        await runAi(() => API.post("/ai/fit-plan", toJobContext(job)));
    };

    const handleOutreachDraft = async (job) => {
        await runAi(() => API.post("/ai/outreach-draft", toJobContext(job)));
    };

    const handleCoverLetter = async (job) => {
        await runAi(() =>
            API.post("/ai/cover-letter", {
                company: job.company,
                role: job.role,
                location: job.location,
                notes: job.notes,
                resumeSummary
            })
        );
    };

    const handleCoachSubmit = async (message) => {
        const prompt = (message || coachMessage).trim();
        if (!prompt) {
            return;
        }

        setCoachMessage("");
        setCoachHistory((current) => [...current, { role: "user", text: prompt }]);

        try {
            setAiLoading(true);
            setAiError("");
            const response = await API.post("/ai/coach", {
                message: prompt,
                jobs: jobs.map(toJobContext)
            });
            setCoachHistory((current) => [
                ...current,
                {
                    role: "assistant",
                    text: response.data.summary,
                    bullets: response.data.bullets,
                    content: response.data.content
                }
            ]);
        } catch (err) {
            const messageText =
                err.response?.data?.error ||
                "AI coach unavailable. Confirm OPENAI_API_KEY is set and ai-service has restarted.";
            setCoachHistory((current) => [
                ...current,
                { role: "assistant", text: messageText, bullets: [], content: "" }
            ]);
        } finally {
            setAiLoading(false);
        }
    };

    const handleAddJob = async (event) => {
        event.preventDefault();

        if (!form.company.trim() || !form.role.trim()) {
            setError("Company and role are required.");
            return;
        }

        try {
            setError("");
            await API.post("/jobs", {
                ...form,
                company: form.company.trim(),
                role: form.role.trim()
            });
            setForm(emptyForm);
            setJobPaste("");
            await loadJobs();
        } catch (err) {
            setError("Could not save this job. Please try again.");
        }
    };

    const moveJob = async (jobId, status) => {
        const job = jobs.find((item) => item.id === jobId);

        if (!job || job.status === status) {
            return;
        }

        const updatedJob = { ...job, status };
        setJobs((currentJobs) =>
            currentJobs.map((item) => (item.id === jobId ? updatedJob : item))
        );

        try {
            setError("");
            await API.put(`/jobs/${jobId}`, updatedJob);
        } catch (err) {
            setError("Could not update job status. Refreshing the board.");
            await loadJobs();
        }
    };

    const handleDeleteJob = async (job) => {
        const confirmed = window.confirm(`Remove ${job.company} - ${job.role} from your tracker?`);
        if (!confirmed) {
            return;
        }

        try {
            setError("");
            await API.delete(`/jobs/${job.id}`);
            setJobs((currentJobs) => currentJobs.filter((item) => item.id !== job.id));
        } catch (err) {
            setError("Could not remove this job. Please try again.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        setToken(null);
    };

    const closeAiModal = () => {
        setShowAiModal(false);
        setAiResult(null);
        setAiError("");
    };

    const renderJobCard = (job, compact = false) => {
        const status = job.status || "Saved";
        const priority = getPriority(job);

        return (
            <article
                className={`job-card ${priority.level}`}
                draggable={!compact}
                key={job.id}
                onDragStart={() => setDraggedJobId(job.id)}
                onDragEnd={() => setDraggedJobId(null)}
            >
                <div className="card-topline">
                    <div>
                        <strong>{job.company}</strong>
                        <h4>{job.role}</h4>
                    </div>
                    <span
                        className="status-pill"
                        style={{ "--status-color": statusMeta[status]?.accent || "#6b7280" }}
                    >
                        {statusMeta[status]?.label || status}
                    </span>
                </div>

                <div className="priority-row">
                    <span className={`priority-badge ${priority.level}`}>{priority.label}</span>
                    <span>{formatActionDate(job.nextActionDate)}</span>
                </div>

                <div className="card-meta">
                    {job.location && <span>{job.location}</span>}
                    {job.salaryRange && <span>{job.salaryRange}</span>}
                    {job.source && <span>{job.source}</span>}
                    {job.appliedDate && <span>Applied {job.appliedDate}</span>}
                </div>

                {(job.contactName || job.contactEmail) && (
                    <p className="contact-line">
                        {job.contactName || "Contact"}
                        {job.contactEmail ? ` - ${job.contactEmail}` : ""}
                    </p>
                )}

                {job.notes && <p className="card-notes">{job.notes}</p>}

                <div className="card-actions">
                    <button
                        className="chip-button"
                        disabled={aiLoading}
                        onClick={() => handleNextAction(job)}
                        type="button"
                    >
                        Next
                    </button>
                    <button
                        className="chip-button"
                        disabled={aiLoading}
                        onClick={() => handleFitPlan(job)}
                        type="button"
                    >
                        Fit plan
                    </button>
                    <button
                        className="chip-button"
                        disabled={aiLoading}
                        onClick={() => handleOutreachDraft(job)}
                        type="button"
                    >
                        Outreach
                    </button>
                    <button
                        className="chip-button"
                        disabled={aiLoading}
                        onClick={() => handleInterviewPrep(job)}
                        type="button"
                    >
                        Prep
                    </button>
                    <button
                        className="chip-button"
                        disabled={aiLoading}
                        onClick={() => handleCoverLetter(job)}
                        type="button"
                    >
                        Letter
                    </button>
                </div>

                <div className="card-footer">
                    {job.jobUrl ? (
                        <a className="job-link" href={job.jobUrl} rel="noreferrer" target="_blank">
                            Open role
                        </a>
                    ) : (
                        <span>No job link</span>
                    )}
                    <button className="danger-link" onClick={() => handleDeleteJob(job)} type="button">
                        Remove
                    </button>
                </div>
            </article>
        );
    };

    return (
        <main className="app-shell">
            <header className="product-header">
                <div className="brand-lockup">
                    <div className="brand-mark">SJ</div>
                    <div>
                        <p className="eyebrow">SmartJobTracker AI</p>
                        <h1>Job search command center</h1>
                    </div>
                </div>
                <div className="topbar-actions">
                    <button
                        className="ai-button"
                        disabled={aiLoading || jobs.length === 0}
                        onClick={handlePipelineInsights}
                    >
                        Analyze pipeline
                    </button>
                    <button className="secondary-button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <section className="command-center">
                <div className="briefing-panel">
                    <div>
                        <p className="panel-kicker">Today</p>
                        <h2>Focus queue</h2>
                    </div>
                    {focusJobs.length === 0 ? (
                        <p className="message">No active opportunities yet.</p>
                    ) : (
                        <div className="focus-list">
                            {focusJobs.slice(0, 4).map((job) => (
                                <button
                                    className="focus-item"
                                    key={job.id}
                                    onClick={() => handleNextAction(job)}
                                    type="button"
                                >
                                    <span className={`priority-dot ${job.priority.level}`} />
                                    <span>
                                        <strong>{job.company}</strong>
                                        <small>{job.role}</small>
                                    </span>
                                    <em>{formatActionDate(job.nextActionDate)}</em>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <section className="ai-coach-panel">
                    <div className="panel-title-row">
                        <div>
                            <p className="panel-kicker">AI copilot</p>
                            <h2>Career coach</h2>
                        </div>
                        <span className={aiLoading ? "live-chip loading" : "live-chip"}>{aiLoading ? "Working" : "Ready"}</span>
                    </div>

                    <div className="coach-prompts">
                        {coachPrompts.map((prompt) => (
                            <button
                                className="chip-button"
                                key={prompt}
                                disabled={aiLoading}
                                onClick={() => handleCoachSubmit(prompt)}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>

                    <div className="coach-history">
                        {coachHistory.length === 0 ? (
                            <p className="message">Ask for prioritization, follow-up language, or weekly execution plans.</p>
                        ) : (
                            coachHistory.map((entry, index) => (
                                <div className={`coach-message ${entry.role}`} key={`${entry.role}-${index}`}>
                                    <strong>{entry.role === "user" ? "You" : "Coach"}</strong>
                                    <p>{entry.text}</p>
                                    {entry.bullets?.length > 0 && (
                                        <ul>
                                            {entry.bullets.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {entry.content && <p className="coach-detail">{entry.content}</p>}
                                </div>
                            ))
                        )}
                    </div>

                    <form
                        className="coach-form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleCoachSubmit();
                        }}
                    >
                        <textarea
                            placeholder="Ask about follow-ups, interviews, offers, or weekly priorities..."
                            value={coachMessage}
                            onChange={(event) => setCoachMessage(event.target.value)}
                        />
                        <button className="primary-button" disabled={aiLoading} type="submit">
                            {aiLoading ? "Thinking..." : "Ask coach"}
                        </button>
                    </form>
                </section>
            </section>

            <section className="stats-strip">
                {stats.map((item) => (
                    <div className="stat-tile" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <small>{item.detail}</small>
                    </div>
                ))}
            </section>

            <section className="workspace-grid">
                <aside className="sidebar-stack">
                    <section className="intake-panel">
                        <button
                            className="section-toggle"
                            onClick={() => setIsIntakeOpen((current) => !current)}
                            type="button"
                        >
                            <span>
                                <span className="panel-kicker">Intake</span>
                                <strong>Add opportunity</strong>
                            </span>
                            <em>{isIntakeOpen ? "Close" : "Open"}</em>
                        </button>

                        {isIntakeOpen && (
                            <form className="job-form" onSubmit={handleAddJob}>
                                <div className="ai-parse-block">
                                    <label>
                                        Job description
                                        <textarea
                                            value={jobPaste}
                                            onChange={(event) => setJobPaste(event.target.value)}
                                            placeholder="Paste the job posting here..."
                                        />
                                    </label>
                                    <button
                                        className="ai-button"
                                        disabled={aiLoading}
                                        onClick={handleParseJob}
                                        type="button"
                                    >
                                        Parse with AI
                                    </button>
                                </div>

                                <div className="field-row">
                                    <label>
                                        Company
                                        <input
                                            value={form.company}
                                            onChange={(event) => updateForm("company", event.target.value)}
                                            placeholder="Company"
                                        />
                                    </label>

                                    <label>
                                        Role
                                        <input
                                            value={form.role}
                                            onChange={(event) => updateForm("role", event.target.value)}
                                            placeholder="Role"
                                        />
                                    </label>
                                </div>

                                <div className="field-row">
                                    <label>
                                        Status
                                        <select
                                            value={form.status}
                                            onChange={(event) => updateForm("status", event.target.value)}
                                        >
                                            {statusOptions.map((option) => (
                                                <option key={option} value={option}>
                                                    {option}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        Applied
                                        <input
                                            type="date"
                                            value={form.appliedDate}
                                            onChange={(event) => updateForm("appliedDate", event.target.value)}
                                        />
                                    </label>
                                </div>

                                <div className="field-row">
                                    <label>
                                        Location
                                        <input
                                            value={form.location}
                                            onChange={(event) => updateForm("location", event.target.value)}
                                            placeholder="Remote, Bengaluru"
                                        />
                                    </label>

                                    <label>
                                        Salary
                                        <input
                                            value={form.salaryRange}
                                            onChange={(event) => updateForm("salaryRange", event.target.value)}
                                            placeholder="18 LPA - 24 LPA"
                                        />
                                    </label>
                                </div>

                                <label>
                                    Job link
                                    <input
                                        value={form.jobUrl}
                                        onChange={(event) => updateForm("jobUrl", event.target.value)}
                                        placeholder="https://..."
                                    />
                                </label>

                                <div className="field-row">
                                    <label>
                                        Source
                                        <input
                                            value={form.source}
                                            onChange={(event) => updateForm("source", event.target.value)}
                                            placeholder="LinkedIn"
                                        />
                                    </label>

                                    <label>
                                        Next action
                                        <input
                                            type="date"
                                            value={form.nextActionDate}
                                            onChange={(event) => updateForm("nextActionDate", event.target.value)}
                                        />
                                    </label>
                                </div>

                                <div className="field-row">
                                    <label>
                                        Contact
                                        <input
                                            value={form.contactName}
                                            onChange={(event) => updateForm("contactName", event.target.value)}
                                            placeholder="Recruiter"
                                        />
                                    </label>

                                    <label>
                                        Contact email
                                        <input
                                            value={form.contactEmail}
                                            onChange={(event) => updateForm("contactEmail", event.target.value)}
                                            placeholder="recruiter@company.com"
                                        />
                                    </label>
                                </div>

                                <label>
                                    Notes
                                    <textarea
                                        value={form.notes}
                                        onChange={(event) => updateForm("notes", event.target.value)}
                                        placeholder="Role signals, recruiter context, prep notes..."
                                    />
                                </label>

                                <button className="primary-button" type="submit">
                                    Add to pipeline
                                </button>
                            </form>
                        )}
                    </section>

                    <section className="profile-panel">
                        <div>
                            <p className="panel-kicker">Profile memory</p>
                            <h2>Cover letter context</h2>
                        </div>
                        <textarea
                            value={resumeSummary}
                            onChange={(event) => setResumeSummary(event.target.value)}
                            placeholder="Summarize your target role, strongest projects, domain experience, and preferred tone..."
                        />
                    </section>
                </aside>

                <section className="pipeline-panel">
                    <div className="list-header">
                        <div>
                            <p className="panel-kicker">Live board</p>
                            <h2>Pipeline</h2>
                        </div>
                        <span>{filteredJobs.length} shown</span>
                    </div>

                    <div className="pipeline-toolbar">
                        <input
                            className="search-input"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search company, role, source, notes..."
                        />
                        <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                            <option value="All">All statuses</option>
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        <div className="segmented-control">
                            <button
                                className={viewMode === "board" ? "active" : ""}
                                onClick={() => setViewMode("board")}
                                type="button"
                            >
                                Board
                            </button>
                            <button
                                className={viewMode === "focus" ? "active" : ""}
                                onClick={() => setViewMode("focus")}
                                type="button"
                            >
                                Focus
                            </button>
                        </div>
                    </div>

                    {error && <p className="message error">{error}</p>}

                    {isLoading ? (
                        <p className="message">Loading pipeline...</p>
                    ) : jobs.length === 0 ? (
                        <div className="empty-state">
                            <h3>No applications yet</h3>
                            <p>Add your first opportunity or paste a job description into the intake panel.</p>
                        </div>
                    ) : viewMode === "focus" ? (
                        <div className="focus-board">
                            {focusJobs.map((job) => renderJobCard(job, true))}
                        </div>
                    ) : (
                        <div className="kanban-board">
                            {statusOptions.map((status) => (
                                <section
                                    className="kanban-column"
                                    key={status}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => {
                                        if (draggedJobId) {
                                            moveJob(draggedJobId, status);
                                            setDraggedJobId(null);
                                        }
                                    }}
                                >
                                    <div className="column-header">
                                        <h3>{status}</h3>
                                        <span>{jobsByStatus[status].length}</span>
                                    </div>

                                    <div className="card-stack">
                                        {jobsByStatus[status].length === 0 ? (
                                            <p className="column-empty">Empty</p>
                                        ) : (
                                            jobsByStatus[status].map((job) => renderJobCard(job))
                                        )}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </section>
            </section>

            {showAiModal && (
                <AiModal
                    error={aiError}
                    isLoading={aiLoading}
                    onClose={closeAiModal}
                    result={aiResult}
                />
            )}
        </main>
    );
}

export default Dashboard;
