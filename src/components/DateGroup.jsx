import React from 'react';
import { LinkCard } from './LinkCard';

export function DateGroup({ group, onDeleteLink, onCopyLink, onEditLink }) {
  const { primaryLabel, secondaryLabel, links } = group;

  return (
    <section className="timeline-date-group" aria-label={`Links from ${primaryLabel}`}>
      {/* Visually Obvious Timeline Date Separator */}
      <div className="timeline-separator-container">
        <div className="timeline-line" />
        <div className="timeline-badge">
          <span className="timeline-primary-title">{primaryLabel}</span>
          {secondaryLabel && (
            <span className="timeline-secondary-date">{secondaryLabel}</span>
          )}
        </div>
        <div className="timeline-line" />
      </div>

      {/* Cards for this day */}
      <div className="date-group-links">
        {links.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            onDelete={onDeleteLink}
            onCopy={onCopyLink}
            onEdit={onEditLink}
          />
        ))}
      </div>
    </section>
  );
}
