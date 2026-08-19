import React from 'react';

const FormattedEmailBody = ({ body }) => {
    if (!body) return null;

    const lines = body.split('\n');

    return (
        <div className="email-body">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                const isQuote = trimmed.startsWith('>');

                if (isQuote) {
                    const depthMatch = line.match(/^(>\s*)+/);
                    const depth = depthMatch ? (depthMatch[0].match(/>/g) || []).length : 1;

                    return (
                        <div key={idx} style={{
                            color: 'var(--text-tertiary)',
                            borderLeft: `2px solid var(--border-primary)`,
                            paddingLeft: '12px',
                            marginLeft: `${(depth - 1) * 12}px`,
                            paddingTop: '2px',
                            paddingBottom: '2px',
                            marginTop: '2px',
                            marginBottom: '2px',
                            fontStyle: 'italic',
                            background: 'var(--bg-glass)',
                            borderTopRightRadius: '4px',
                            borderBottomRightRadius: '4px'
                        }}>
                            {line.replace(/^(>\s*)+/, '')}
                        </div>
                    );
                }

                return (
                    <div key={idx} style={{ minHeight: '1.5em' }}>
                        {line}
                    </div>
                );
            })}
        </div>
    );
};

export default FormattedEmailBody;
