import React from 'react';

export default function SpectraSymbol({ symbol = 'headset', className = '' }) {
    return (
        <span className={`tm-symbol tm-symbol-${symbol}${className ? ` ${className}` : ''}`} aria-hidden>
            <span className="tm-symbol-core" />
        </span>
    );
}
