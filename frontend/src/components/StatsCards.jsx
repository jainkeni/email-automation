const StatsCards = ({ stats }) => {
    const cards = [
        {
            type: 'total',
            label: 'Total Requests',
            value: stats?.total || 0,
            icon: '📨',
        },
        {
            type: 'pending',
            label: 'Pending Review',
            value: stats?.pending || 0,
            icon: '⏳',
        },
        {
            type: 'approved',
            label: 'Approved',
            value: stats?.approved || 0,
            icon: '✅',
        },
        {
            type: 'rejected',
            label: 'Rejected',
            value: stats?.rejected || 0,
            icon: '❌',
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
