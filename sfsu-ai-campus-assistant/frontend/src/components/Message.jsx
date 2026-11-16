import MapCard from "./MapCard.jsx";

export default function Message({ message }) {
  if (message.role === "user") {
    return <div className="bubble bubble--user">{message.text}</div>;
  }

  return (
    <div className="reply">
      <div className="bubble bubble--assistant">{message.text}</div>

      {message.location && <MapCard location={message.location} />}

      {message.sources?.length > 0 && (
        <div className="sources">
          <span className="sources__label">Sources</span>
          {message.sources.map((s) => (
            // Only link http(s) URLs: sources come from scraped data, and a
            // javascript: URL in a chip would run script when clicked.
            /^https?:\/\//i.test(s.url) && (
              <a key={s.url} className="chip" href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
            )
          ))}
        </div>
      )}
    </div>
  );
}
