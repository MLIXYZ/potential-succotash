// Shown only when the backend sends `location: { name, mapQuery }`.
// With VITE_GOOGLE_MAPS_KEY set it embeds a live Google map; without a key it
// shows the static placeholder so the layout works during development.
const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function MapCard({ location }) {
  const query = encodeURIComponent(location.mapQuery || location.name);

  return (
    <div className="map">
      {KEY ? (
        <iframe
          title={`Map of ${location.name}`}
          className="map__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${query}`}
        />
      ) : (
        <svg viewBox="0 0 600 220" className="map__frame" role="img"
             aria-label={`Map placeholder showing a pin for ${location.name}`}
             preserveAspectRatio="xMidYMid slice">
          <rect width="600" height="220" fill="#F6F0D6" />
          <rect x="40" y="30" width="150" height="70" fill="#FFE2B4" />
          <rect x="230" y="30" width="120" height="70" fill="#FFE2B4" />
          <rect x="390" y="30" width="170" height="70" fill="#FFE2B4" />
          <rect x="40" y="140" width="210" height="60" fill="#FFE2B4" />
          <rect x="290" y="140" width="270" height="60" fill="#FFE2B4" />
          <rect x="0" y="108" width="600" height="24" fill="#FFFFFF" />
          <rect x="196" y="0" width="28" height="220" fill="#FFFFFF" />
          <path d="M300 58c-9 0-16 7-16 16 0 12 16 28 16 28s16-16 16-28c0-9-7-16-16-16z" fill="#442C8B" />
          <circle cx="300" cy="74" r="6" fill="#DCAE27" />
        </svg>
      )}
      <div className="map__footer">
        <span className="map__name">{location.name}</span>
        <a className="map__link" target="_blank" rel="noopener noreferrer"
           href={`https://www.google.com/maps/search/?api=1&query=${query}`}>
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}
