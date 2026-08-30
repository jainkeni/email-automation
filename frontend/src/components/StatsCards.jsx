const StatsCards = ({ stats }) => {
    const cards = [
        {
            type: 'total',
            label: 'Total Requests',
            value: stats?.total || 0,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                </svg>
            ),
        },
        {
            type: 'pending',
            label: 'Pending Review',
            value: stats?.pending || 0,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
            ),
        },
        {
            type: 'approved',
            label: 'Approved',
            value: stats?.approved || 0,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
            ),
        },
        {
            type: 'rejected',
            label: 'Rejected',
            value: stats?.rejected || 0,
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
            ),
        },
    ];

    return (
        <div className="stats-grid">
            {cards.map((card, index) => (
                <div
                    key={card.type}
                    className={`stat-card ${card.type} stagger-item`}
                    style={{ animationDelay: `${index * 0.08}s` }}
                >
                    <div className="stat-card-header">
                        <span className="stat-card-label">{card.label}</span>
                        <div className="stat-card-icon">{card.icon}</div>
                    </div>
                    <div className="stat-card-value">{card.value}</div>
                </div>
            ))}
        </div>
    );
};

export default StatsCards;
