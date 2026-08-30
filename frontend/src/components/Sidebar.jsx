import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const icons = {
    dashboard: (
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="4" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /></svg>
    ),
    email: (
        <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,6 12,13 2,6" /></svg>
    ),
    quotation: (
        <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
    ),
    products: (
        <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
    ),
    customers: (
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
    settings: (
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
    ),
    logout: (
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
    ),
};

const Sidebar = ({ pendingCount = 0, isOpen, onClose, isCollapsed, setIsCollapsed, theme, setTheme }) => {
    const { admin, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: icons.dashboard },
        { path: '/requests', label: 'Email Requests', icon: icons.email, badge: pendingCount },
        { path: '/quotations', label: 'Quotations', icon: icons.quotation },
        { path: '/products', label: 'Products', icon: icons.products },
        { path: '/customers', label: 'Customers', icon: icons.customers },
        { path: '/settings', label: 'Settings', icon: icons.settings },
    ];

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', flexDirection: isCollapsed ? 'column' : 'row', gap: isCollapsed ? '12px' : '0' }}>
                    <div
                        className="sidebar-logo"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{ cursor: 'pointer' }}
                        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        <div className="sidebar-logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                        </div>
                        {!isCollapsed && (
                            <div>
                                <div className="sidebar-logo-text">MailPilot</div>
                                <div className="sidebar-logo-sub">Email Automation</div>
                            </div>
                        )}
                    </div>

                    <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px', borderRadius: '50%' }}
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {theme === 'dark' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        )}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `sidebar-nav-item ${isActive ? 'active' : ''}`
                            }
                            onClick={onClose}
                            title={isCollapsed ? item.label : undefined}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                            {item.badge > 0 && (
                                <span className="nav-badge">{item.badge}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user" title={isCollapsed ? `${admin?.name} (${admin?.email})` : undefined}>
                        <div className="sidebar-avatar">
                            {getInitials(admin?.name)}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{admin?.name || 'Admin'}</div>
                            <div className="sidebar-user-email">{admin?.email || ''}</div>
                        </div>
                        <button className="sidebar-logout-btn" onClick={logout} title="Sign out">
                            {icons.logout}
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
