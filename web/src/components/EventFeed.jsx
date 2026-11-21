const time = (value) =>
  new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function EventFeed({ events }) {
  return (
    <div className="event-feed">
      {events.length === 0 ? (
        <div className="empty-feed">
          <p>No events yet.</p>
          <span>Seal a packet, then gossip and flush the bridges.</span>
        </div>
      ) : (
        events.map((event) => (
          <div key={event.id} className={`event-row kind-${event.kind}`}>
            <div className="event-marker" />
            <div>
              <div className="event-title-row">
                <p>{event.title}</p>
                <span className="mono tiny">{time(event.at)}</span>
              </div>
              {event.detail && <p className="event-detail">{event.detail}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
