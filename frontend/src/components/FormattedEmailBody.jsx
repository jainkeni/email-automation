const FormattedEmailBody = ({ body }) => {
    if (!body) return <p style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No email body available.</p>;

    // Split quoted text blocks
    const lines = body.split('\n');
    const elements = [];
    let currentBlock = [];
    let isQuoted = false;

    const flushBlock = () => {
        if (currentBlock.length === 0) return;
        const text = currentBlock.join('\n');
        if (isQuoted) {
            elements.push(
                <blockquote
                    key={elements.length}
                    style={{
                        borderLeft: '3px solid var(--border-accent)',
                        paddingLeft: '16px',
                        margin: '12px 0',
                        color: 'var(--text-tertiary)',
                        fontSize: '13px',
                        lineHeight: '1.7',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        background: 'var(--bg-glass)',
                        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                        padding: '12px 16px',
                    }}
                >
                    {text}
                </blockquote>
            );
        } else {
            elements.push(
                <div
                    key={elements.length}
                    className="email-body"
                    style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {text}
                </div>
            );
        }
        currentBlock = [];
    };

    for (const line of lines) {
        const lineIsQuoted = line.startsWith('>');
        if (lineIsQuoted !== isQuoted) {
            flushBlock();
            isQuoted = lineIsQuoted;
        }
        currentBlock.push(lineIsQuoted ? line.substring(1).trim() : line);
    }
    flushBlock();

    return <div>{elements}</div>;
};

export default FormattedEmailBody;
