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
                            <span className="card-header-title">🏢 Company Information</span>
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
                            <span className="card-header-title">📞 Contact Details</span>
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
                            <span className="card-header-title">📦 Products & Services</span>
                        </div>
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Products / Services (one per line)</label>
                                <textarea
                                    className="form-textarea"
                                    value={productsText}
                                    onChange={(e) => setProductsText(e.target.value)}
                                    placeholder="Product A - Description&#10;Product B - Description&#10;Service C - Description"
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
                            <span className="card-header-title">📋 Business Policies</span>
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
                        <span className="card-header-title">🤖 AI Response Configuration</span>
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
                        {saving ? '⏳ Saving...' : '💾 Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsPage;
