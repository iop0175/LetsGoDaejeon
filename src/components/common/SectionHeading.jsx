export default function SectionHeading({ eyebrow, title, description, children }) {
  return (
    <div className="city-section-heading">
      <div className="city-section-heading__copy">
        {eyebrow && <span className="city-section-heading__eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="city-section-heading__actions">{children}</div>}
    </div>
  )
}
