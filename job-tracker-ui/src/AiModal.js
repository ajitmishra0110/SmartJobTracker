import React from "react";

function AiModal({ result, onClose, isLoading, error }) {
    if (!result && !isLoading && !error) {
        return null;
    }

    const copyContent = async () => {
        const text = [
            result?.title,
            result?.summary,
            ...(result?.bullets || []),
            result?.content
        ]
            .filter(Boolean)
            .join("\n\n");

        if (text && navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        }
    };

    return (
        <div className="ai-modal-backdrop" onClick={onClose}>
            <div className="ai-modal" onClick={(event) => event.stopPropagation()}>
                <div className="ai-modal-header">
                    <div>
                        <p className="panel-kicker">SmartJobTracker AI</p>
                        <h2>{result?.title || "Working..."}</h2>
                    </div>
                    <div className="topbar-actions">
                        {result && (
                            <button className="secondary-button" onClick={copyContent} type="button">
                                Copy
                            </button>
                        )}
                        <button className="secondary-button" onClick={onClose} type="button">
                            Close
                        </button>
                    </div>
                </div>

                {isLoading && <p className="message">Thinking through the best next move...</p>}

                {error && <p className="message error">{error}</p>}

                {!isLoading && result && (
                    <div className="ai-modal-body">
                        {result.summary && <p className="ai-summary">{result.summary}</p>}

                        {result.bullets?.length > 0 && (
                            <ul className="ai-bullets">
                                {result.bullets.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        )}

                        {result.content && (
                            <div className="ai-content-block">
                                <p>{result.content}</p>
                            </div>
                        )}

                        {result.matchScore && (
                            <div className="ai-match-strip">
                                <strong>{result.matchScore}</strong>
                                <span>{result.matchSummary}</span>
                            </div>
                        )}

                        {result.suggestedSkills && (
                            <p className="ai-skills">
                                Key skills: {result.suggestedSkills}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AiModal;
