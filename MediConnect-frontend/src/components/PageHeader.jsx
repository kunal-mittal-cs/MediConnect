import React from 'react';

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && (
          <span className="eyebrow">
            {eyebrow}
          </span>
        )}

        {title && <h1>{title}</h1>}

        {description && (
          <p>{description}</p>
        )}
      </div>

      {action && (
        <div className="page-header-action">
          {action}
        </div>
      )}
    </header>
  );
}