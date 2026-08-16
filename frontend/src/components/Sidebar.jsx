import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ pendingCount = 0, isOpen, onClose }) => {
    const { admin, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/requests', label: 'Email Requests', icon: '📧', badge: pendingCount },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
    ];

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">⚡</div>
                        <div>
                            <div className="sidebar-logo-text">MailPilot</div>
                            <div className="sidebar-logo-sub">Email Automation</div>
                        </div>
                    </div>
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
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                            {item.badge > 0 && (
                                <span className="nav-badge">{item.badge}</span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {getInitials(admin?.name)}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{admin?.name || 'Admin'}</div>
                            <div className="sidebar-user-email">{admin?.email || ''}</div>
                        </div>
                        <button className="sidebar-logout-btn" onClick={logout} title="Sign out">
                            🚪
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
