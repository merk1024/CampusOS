function StatusBanner({
  tone = 'info',
  title,
  message,
  className = ''
}) {
  if (!message) {
    return null;
  }

  const classes = ['status-banner', `status-banner-${tone}`, className].filter(Boolean).join(' ');

  return (
    <div className={classes} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="status-banner-copy">
        {title ? <strong>{title}</strong> : null}
        <span>{message}</span>
      </div>
    </div>
  );
}

export default StatusBanner;
