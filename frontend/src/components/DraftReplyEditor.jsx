import { useState } from 'react';

const DraftReplyEditor = ({
    draftReply,
    status,
    onApprove,
    onReject,
    onRegenerate,
    isApproving,
    isRejecting,
    isRegenerating,
}) => {
    const [replyText, setReplyText] = useState(draftReply || '');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    const handleApprove = () => {
        if (!replyText.trim()) return;
        onApprove(replyText);
    };

    const handleReject = () => {
        if (showRejectInput) {
            onReject(rejectReason);
        } else {
            setShowRejectInput(true);
        }
    };

    const handleRegenerate = async () => {
        const newDraft = await onRegenerate();
        if (newDraft) {
            setReplyText(newDraft);
        }
    };

    const isPending = status === 'pending';

    const getStatusIcon = () => {
        if (isPending) return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
        );
        if (status === 'approved') return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        );
        return (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        );
    };

    return (
        <div className="glass-card draft-editor fade-in">
            <div className="card-header">
                <span className="card-header-title">
                    {getStatusIcon()}
                    {isPending ? 'Draft Reply' : status === 'approved' ? 'Sent Reply' : 'Rejected'}
                </span>
                {isPending && (
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                    >
                        {isRegenerating ? (
                            <>
                                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                Regenerating...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                </svg>
                                Regenerate AI Draft
                            </>
                        )}
                    </button>
                )}
            </div>
            <div className="card-body">
                {isPending ? (
                    <>
                        <textarea
                            className="form-textarea"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Edit or write your reply here..."
                            rows={10}
                        />

                        {showRejectInput && (
                            <div style={{ marginTop: '12px' }}>
                                <input
                                    className="form-input"
                                    type="text"
                                    placeholder="Reason for rejection (optional)"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="draft-actions">
                            <button
                                className="btn btn-success"
                                onClick={handleApprove}
                                disabled={isApproving || !replyText.trim()}
                            >
                                {isApproving ? (
                                    <>
                                        <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                        Approve & Send
                                    </>
                                )}
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleReject}
                                disabled={isRejecting}
                            >
                                {isRejecting ? (
                                    <>
                                        <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                        Rejecting...
                                    </>
                                ) : showRejectInput ? (
                                    'Confirm Reject'
                                ) : (
                                    'Reject'
                                )}
                            </button>
                            {showRejectInput && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setShowRejectInput(false)}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="email-body" style={{ whiteSpace: 'pre-wrap' }}>
                        {status === 'approved'
                            ? replyText || draftReply
                            : `This request was rejected.${rejectReason ? `\nReason: ${rejectReason}` : ''}`}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DraftReplyEditor;
