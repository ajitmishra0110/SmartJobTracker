import React, { useEffect, useMemo, useState } from "react";
import API from "./api";
import { extractTextFromPdf, parseQuestionsFromText } from "./prepPdf";

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
    if (!value) return "";
    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function prepProgress(prep) {
    const total = prep.questions?.length || 0;
    const done = prep.questions?.filter((q) => q.solved).length || 0;
    return {
        total,
        done,
        left: total - done,
        pct: total === 0 ? 0 : Math.round((done / total) * 100),
    };
}

function PrepPanel() {
    const [prepSets, setPrepSets] = useState([]);
    const [activePrepId, setActivePrepId] = useState(null);
    const [filter, setFilter] = useState("all");
    const [prepName, setPrepName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");

    const activePrep = useMemo(
        () => prepSets.find((prep) => prep.id === activePrepId) || null,
        [prepSets, activePrepId]
    );

    const filteredQuestions = useMemo(() => {
        if (!activePrep?.questions) return [];
        return activePrep.questions.filter((question) => {
            if (filter === "done") return question.solved;
            if (filter === "open") return !question.solved;
            return true;
        });
    }, [activePrep, filter]);

    useEffect(() => {
        let cancelled = false;

        async function loadPrepSets() {
            try {
                setError("");
                const res = await API.get("/jobs/prep-sets");
                if (cancelled) return;
                setPrepSets(res.data);
                if (res.data.length > 0) {
                    setActivePrepId((current) => current ?? res.data[0].id);
                }
            } catch (err) {
                if (!cancelled) {
                    setError("Could not load interview prep sets. Make sure job-service is running.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadPrepSets();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleCreateFromPdf = async (event) => {
        event.preventDefault();
        setStatus("");
        setError("");

        if (!selectedFile) {
            setError("Choose a PDF first.");
            return;
        }

        const name = prepName.trim() || selectedFile.name.replace(/\.pdf$/i, "");
        setUploading(true);

        try {
            const text = await extractTextFromPdf(selectedFile);
            const questions = parseQuestionsFromText(text);

            if (questions.length === 0) {
                setError("No questions found. Use numbered lines (1. …) or one question per line.");
                return;
            }

            const res = await API.post("/jobs/prep-sets", {
                name,
                fileName: selectedFile.name,
                questions,
            });

            setPrepSets((current) => [res.data, ...current]);
            setActivePrepId(res.data.id);
            setPrepName("");
            setSelectedFile(null);
            setStatus(`Added ${questions.length} questions to "${name}".`);
        } catch (err) {
            const message =
                err.response?.data?.message ||
                err.response?.data ||
                "Could not create prep set. Use a text-based PDF.";
            setError(typeof message === "string" ? message : "Could not create prep set.");
        } finally {
            setUploading(false);
        }
    };

    const toggleQuestion = async (question, solved, solvedDate) => {
        if (!activePrep) return;

        try {
            const res = await API.patch(
                `/jobs/prep-sets/${activePrep.id}/questions/${question.id}`,
                {
                    solved,
                    solvedDate: solved ? solvedDate || todayISO() : null,
                }
            );

            setPrepSets((current) =>
                current.map((prep) => {
                    if (prep.id !== activePrep.id) return prep;
                    return {
                        ...prep,
                        questions: prep.questions.map((item) =>
                            item.id === question.id ? { ...item, ...res.data } : item
                        ),
                    };
                })
            );
        } catch (err) {
            setError("Could not update question progress.");
        }
    };

    const handleDeletePrep = async () => {
        if (!activePrep) return;
        if (!window.confirm(`Delete "${activePrep.name}" and all progress?`)) return;

        try {
            await API.delete(`/jobs/prep-sets/${activePrep.id}`);
            const remaining = prepSets.filter((prep) => prep.id !== activePrep.id);
            setPrepSets(remaining);
            setActivePrepId(remaining[0]?.id || null);
        } catch (err) {
            setError("Could not delete prep set.");
        }
    };

    const progress = activePrep ? prepProgress(activePrep) : { total: 0, done: 0, left: 0, pct: 0 };

    return (
        <section className="prep-workspace">
            <div className="prep-layout">
                <aside className="prep-sidebar">
                    <div className="prep-upload-panel">
                        <p className="panel-kicker">New prep set</p>
                        <h2>Upload PDF</h2>
                        <form onSubmit={handleCreateFromPdf}>
                            <label>
                                Prep name
                                <input
                                    value={prepName}
                                    onChange={(event) => setPrepName(event.target.value)}
                                    placeholder="Amazon SDE-2 round"
                                />
                            </label>
                            <label className="file-picker">
                                PDF file
                                <input
                                    accept="application/pdf,.pdf"
                                    onChange={(event) => setSelectedFile(event.target.files[0] || null)}
                                    type="file"
                                />
                                <span>{selectedFile ? selectedFile.name : "Choose PDF"}</span>
                            </label>
                            <button className="primary-button" disabled={uploading} type="submit">
                                {uploading ? "Processing PDF..." : "Create prep set"}
                            </button>
                        </form>
                        {status && <p className="message success">{status}</p>}
                    </div>

                    <div className="prep-list-panel">
                        <p className="panel-kicker">Your prep sets</p>
                        {loading ? (
                            <p className="message">Loading...</p>
                        ) : prepSets.length === 0 ? (
                            <p className="message">Upload a PDF to create your first prep set.</p>
                        ) : (
                            prepSets.map((prep) => {
                                const stats = prepProgress(prep);
                                return (
                                    <button
                                        className={
                                            "prep-list-item" + (prep.id === activePrepId ? " active" : "")
                                        }
                                        key={prep.id}
                                        onClick={() => setActivePrepId(prep.id)}
                                        type="button"
                                    >
                                        <strong>{prep.name}</strong>
                                        <small>
                                            {stats.done}/{stats.total} done · {formatDate(prep.createdAt)}
                                        </small>
                                        <div className="prep-progress-bar">
                                            <span style={{ width: `${stats.pct}%` }} />
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>

                <section className="prep-main">
                    {error && <p className="message error">{error}</p>}

                    {!activePrep ? (
                        <div className="empty-state">
                            <h3>Select or create a prep set</h3>
                            <p>Upload a PDF on the left to track solved interview questions with dates.</p>
                        </div>
                    ) : (
                        <>
                            <div className="prep-main-header">
                                <div>
                                    <p className="panel-kicker">Interview prep</p>
                                    <h2>{activePrep.name}</h2>
                                    <p className="prep-meta">
                                        {activePrep.fileName} · {progress.total} questions · uploaded{" "}
                                        {formatDate(activePrep.createdAt)}
                                    </p>
                                </div>
                                <div className="prep-stats-row">
                                    <div className="stat-tile">
                                        <span>Total</span>
                                        <strong>{progress.total}</strong>
                                    </div>
                                    <div className="stat-tile">
                                        <span>Done</span>
                                        <strong>{progress.done}</strong>
                                    </div>
                                    <div className="stat-tile">
                                        <span>Left</span>
                                        <strong>{progress.left}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="segmented-control prep-filters">
                                <button
                                    className={filter === "all" ? "active" : ""}
                                    onClick={() => setFilter("all")}
                                    type="button"
                                >
                                    All
                                </button>
                                <button
                                    className={filter === "open" ? "active" : ""}
                                    onClick={() => setFilter("open")}
                                    type="button"
                                >
                                    Remaining
                                </button>
                                <button
                                    className={filter === "done" ? "active" : ""}
                                    onClick={() => setFilter("done")}
                                    type="button"
                                >
                                    Completed
                                </button>
                            </div>

                            <ul className="prep-question-list">
                                {filteredQuestions.map((question, index) => (
                                    <li
                                        className={"prep-question" + (question.solved ? " solved" : "")}
                                        key={question.id}
                                    >
                                        <input
                                            checked={question.solved}
                                            onChange={(event) =>
                                                toggleQuestion(
                                                    question,
                                                    event.target.checked,
                                                    question.solvedDate || todayISO()
                                                )
                                            }
                                            type="checkbox"
                                        />
                                        <p>
                                            {index + 1}. {question.text}
                                        </p>
                                        <label>
                                            Solved on
                                            <input
                                                disabled={!question.solved}
                                                onChange={(event) =>
                                                    toggleQuestion(question, true, event.target.value)
                                                }
                                                type="date"
                                                value={question.solvedDate || todayISO()}
                                            />
                                        </label>
                                    </li>
                                ))}
                            </ul>

                            <button className="danger-link" onClick={handleDeletePrep} type="button">
                                Delete this prep set
                            </button>
                        </>
                    )}
                </section>
            </div>
        </section>
    );
}

export default PrepPanel;
