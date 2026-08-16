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

    return (
        <div className="glass-card draft-editor fade-in">
            <div className="card-header">
                <span className="card-header-title">
                    {isPending ? '✏️ Draft Reply' : status === 'approved' ? '✅ Sent Reply' : '❌ Rejected'}
                </span>
                {isPending && (
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                    >
                        {isRegenerating ? '⏳ Regenerating...' : '🔄 Regenerate AI Draft'}
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
                                {isApproving ? '⏳ Sending...' : '✅ Approve & Send Reply'}
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleReject}
                                disabled={isRejecting}
                            >
                                {isRejecting
                                    ? '⏳ Rejecting...'
                                    : showRejectInput
                                        ? '🗑️ Confirm Reject'
                                        : '❌ Reject'}
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
