import './SpectraLogo.css';

export default function SpectraLogo({ className = '', decorative = false }) {
    return <img
        className={`spectra-logo${className ? ` ${className}` : ''}`}
        src="/spectra-wordmark.svg"
        alt={decorative ? '' : 'SPECTRA'}
        width="1200"
        height="110"
        draggable={false}
    />;
}
