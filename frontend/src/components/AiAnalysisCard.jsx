const AiAnalysisCard = ({ analysis }) => {
    if (!analysis) return null;

    const fields = [
        { label: 'Customer', value: analysis.customerName },
        { label: 'Company', value: analysis.company },
        { label: 'Product / Service', value: analysis.productOrServiceNeeded },
        { label: 'Specifications', value: analysis.specifications },
        { label: 'Quantity', value: analysis.quantity },
        { label: 'Budget', value: analysis.budget },
        { label: 'Timeline', value: analysis.timeline },
    ].filter(f => f.value && f.value !== 'Not specified' && f.value !== '');

    return (
        <div className="glass-card ai-analysis-card fade-in">
            <div className="card-header">
                <span className="card-header-title">
                    <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    AI Analysis
                </span>
                <span className="ai-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                    AI Powered
                </span>
            </div>
            <div className="card-body">
                {/* Category & Urgency */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <span className="badge badge-category">
                        {analysis.category || 'General Inquiry'}
                    </span>
                    <span className={`badge badge-urgency-${analysis.urgency || 'medium'}`}>
                        {(analysis.urgency || 'medium').charAt(0).toUpperCase() +
                            (analysis.urgency || 'medium').slice(1)} Priority
                    </span>
                </div>

                {/* Summary */}
                {analysis.summary && (
                    <div className="ai-field" style={{ marginBottom: '20px' }}>
                        <div className="ai-field-label">Summary</div>
                        <div className="ai-field-value" style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>
                            {analysis.summary}
                        </div>
                    </div>
                )}

                {/* Extracted Fields */}
                {fields.map((field) => (
                    <div key={field.label} className="ai-field">
                        <div className="ai-field-label">{field.label}</div>
                        <div className="ai-field-value">{field.value}</div>
                    </div>
                ))}

                {/* Key Points */}
                {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                    <div className="ai-field" style={{ marginTop: '16px' }}>
                        <div className="ai-field-label">Key Points</div>
                        <ul className="ai-key-points">
                            {analysis.keyPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAnalysisCard;
