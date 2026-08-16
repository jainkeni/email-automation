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
                <span className="card-header-title">🤖 AI Analysis</span>
                <span className="ai-badge">✨ AI Powered</span>
            </div>
            <div className="card-body">
                {/* Category & Urgency */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <span className="badge badge-category">
                        {analysis.category || 'General Inquiry'}
                    </span>
                    <span className={`badge badge-urgency-${analysis.urgency || 'medium'}`}>
                        {analysis.urgency === 'high' && '🔴 '}
                        {analysis.urgency === 'medium' && '🟡 '}
                        {analysis.urgency === 'low' && '🟢 '}
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
