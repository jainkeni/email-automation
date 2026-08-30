import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../services/api';

const SettingsPage = () => {
    const [settings, setSettings] = useState({
        companyName: '',
        industry: '',
        productsAndServices: [],
        pricingInfo: '',
        businessHours: '',
        location: '',
        contactEmail: '',
        contactPhone: '',
        website: '',
        policies: {
            responseTime: '',
            minimumOrderQuantity: '',
            paymentTerms: '',
            shippingInfo: '',
            warrantyInfo: '',
        },
        toneOfVoice: '',
        additionalNotes: '',
    });
    const [productsText, setProductsText] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.get();
            setSettings(res.data);
            setProductsText((res.data.productsAndServices || []).join('\n'));
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const saveData = {
                ...settings,
                productsAndServices: productsText
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean),
            };
            await settingsAPI.update(saveData);
            toast.success('Settings saved successfully!');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const updatePolicy = (field, value) => {
        setSettings((prev) => ({
            ...prev,
            policies: { ...prev.policies, [field]: value },
        }));
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner" />
                <span className="loading-text">Loading settings...</span>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">
                    Configure your company information — this data is used by AI to generate contextual replies
                </p>
            </div>

            <form onSubmit={handleSave}>
                <div className="settings-grid">
                    {/* Company Info */}
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                Company Information
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Company Name</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.companyName}
                                    onChange={(e) => updateField('companyName', e.target.value)}
                                    placeholder="Your Company Name"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Industry</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.industry}
                                    onChange={(e) => updateField('industry', e.target.value)}
                                    placeholder="e.g. Manufacturing, IT Services"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    placeholder="e.g. Mumbai, India"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Business Hours</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.businessHours}
                                    onChange={(e) => updateField('businessHours', e.target.value)}
                                    placeholder="e.g. Monday - Friday, 9 AM - 6 PM IST"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                Contact Details
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Contact Email</label>
                                <input
                                    className="form-input"
                                    type="email"
                                    value={settings.contactEmail}
                                    onChange={(e) => updateField('contactEmail', e.target.value)}
                                    placeholder="info@company.com"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Contact Phone</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.contactPhone}
                                    onChange={(e) => updateField('contactPhone', e.target.value)}
                                    placeholder="+91-XXXXXXXXXX"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Website</label>
                                <input
                                    className="form-input"
                                    type="url"
                                    value={settings.website}
                                    onChange={(e) => updateField('website', e.target.value)}
                                    placeholder="https://yourcompany.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Products & Services */}
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                                Products & Services
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Products / Services (one per line)</label>
                                <textarea
                                    className="form-textarea"
                                    value={productsText}
                                    onChange={(e) => setProductsText(e.target.value)}
                                    placeholder={"Product A - Description\nProduct B - Description\nService C - Description"}
                                    rows={6}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Pricing Info</label>
                                <textarea
                                    className="form-textarea"
                                    value={settings.pricingInfo}
                                    onChange={(e) => updateField('pricingInfo', e.target.value)}
                                    placeholder="Brief pricing structure or policy"
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Policies */}
                    <div className="glass-card">
                        <div className="card-header">
                            <span className="card-header-title">
                                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                Business Policies
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Response Time</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.policies?.responseTime || ''}
                                    onChange={(e) => updatePolicy('responseTime', e.target.value)}
                                    placeholder="e.g. Within 24 hours"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Minimum Order Quantity</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.policies?.minimumOrderQuantity || ''}
                                    onChange={(e) => updatePolicy('minimumOrderQuantity', e.target.value)}
                                    placeholder="e.g. Varies by product"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Terms</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.policies?.paymentTerms || ''}
                                    onChange={(e) => updatePolicy('paymentTerms', e.target.value)}
                                    placeholder="e.g. Net 30 days"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Shipping Info</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.policies?.shippingInfo || ''}
                                    onChange={(e) => updatePolicy('shippingInfo', e.target.value)}
                                    placeholder="e.g. Pan-India delivery"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Warranty</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.policies?.warrantyInfo || ''}
                                    onChange={(e) => updatePolicy('warrantyInfo', e.target.value)}
                                    placeholder="e.g. 1 year standard warranty"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Tone & Notes */}
                <div className="glass-card" style={{ marginTop: '24px' }}>
                    <div className="card-header">
                        <span className="card-header-title">
                            <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                            AI Response Configuration
                        </span>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                            <div className="form-group">
                                <label className="form-label">Tone of Voice</label>
                                <input
                                    className="form-input"
                                    type="text"
                                    value={settings.toneOfVoice}
                                    onChange={(e) => updateField('toneOfVoice', e.target.value)}
                                    placeholder="e.g. Professional, friendly, solution-oriented"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Additional Notes for AI</label>
                                <textarea
                                    className="form-textarea"
                                    value={settings.additionalNotes}
                                    onChange={(e) => updateField('additionalNotes', e.target.value)}
                                    placeholder="Any additional context the AI should know about your business..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                        {saving ? (
                            <>
                                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                                </svg>
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
