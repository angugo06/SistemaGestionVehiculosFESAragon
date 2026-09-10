function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`brand ${dark ? 'brand-dark' : ''}`}>
      <span className="brand-mark">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <path d="M5 32 18 7h4l13 25h-9l-6-13-6 13Z" fill="currentColor" />
          <path d="M17 28h6v4h-6z" fill="currentColor" />
        </svg>
      </span>
      <div>
        <strong>ARAGÓN</strong>
        <span>M O V I L I D A D</span>
      </div>
    </div>
  );
}


export default Brand;
