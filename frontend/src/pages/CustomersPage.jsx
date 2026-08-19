import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { customersAPI } from '../services/api';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => {
        fetchCustomers();
    }, [pagination.page, searchTerm]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const { data } = await customersAPI.getAll({
                page: pagination.page,
                search: searchTerm
            });
            setCustomers(data.customers);
            setPagination(data.pagination);
        } catch (error) {
            toast.error('Failed to fetch customers');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setPagination({ ...pagination, page: 1 });
    };

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Customers</h1>
                    <p className="page-subtitle">Manage customer directory and purchase history</p>
                </div>
            </header>

            <div className="card card-body" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <input
                    type="text"
                    placeholder="Search by company name, contact, or email..."
                    className="form-input"
                    value={searchTerm}
                    onChange={handleSearch}
                    style={{ maxWidth: '400px' }}
                />
            </div>

            <div className="card">
                {loading ? (
                    <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading customers...</div>
                ) : (
                    <>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Company Name</th>
                                    <th>Contact Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                                            No customers found.
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map(customer => (
                                        <tr key={customer.id}>
                                            <td style={{ fontWeight: '500' }}>{customer.company_name}</td>
                                            <td>{customer.contact_name || '—'}</td>
                                            <td><a href={`mailto:${customer.email}`}>{customer.email}</a></td>
                                            <td>{customer.phone || '—'}</td>
                                            <td>
                                                <span className={`status-badge status-${customer.status}`}>
                                                    {customer.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-lg)' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Showing {customers.length} of {pagination.total} customers
                            </span>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button className="pagination-btn" disabled={pagination.page === 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>
                                    Previous
                                </button>
                                <button className="pagination-btn" disabled={pagination.page === pagination.pages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CustomersPage;
