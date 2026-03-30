function EmptyState({
  eyebrow = 'CampusOS',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  className = ''
}) {
  const classes = ['empty-state-card', compact ? 'compact' : '', className].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {eyebrow ? <span className="empty-state-eyebrow">{eyebrow}</span> : null}
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
      {(actionLabel || secondaryActionLabel) ? (
        <div className="empty-state-actions">
          {secondaryActionLabel ? (
            <button type="button" className="btn-secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          ) : null}
          {actionLabel ? (
            <button type="button" className="btn-primary" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default EmptyState;
