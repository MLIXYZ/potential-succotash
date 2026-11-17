import type { CSSProperties } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import { brand } from "../theme";
import type { MapLocation } from "../types";

// Shown only when the backend sends `location: { name, mapQuery }`.
// With VITE_GOOGLE_MAPS_KEY set it embeds a live Google map; without a key it
// shows the static placeholder so the layout works during development.
const KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

const frame: CSSProperties = { display: "block", width: "100%", height: 220, border: 0 };

export default function MapCard({ location }: { location: MapLocation }) {
  const query = encodeURIComponent(location.mapQuery || location.name);

  return (
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      {KEY ? (
        <iframe
          title={`Map of ${location.name}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${KEY}&q=${query}`}
          style={frame}
        />
      ) : (
        <svg
          viewBox="0 0 600 220"
          role="img"
          aria-label={`Map placeholder showing a pin for ${location.name}`}
          preserveAspectRatio="xMidYMid slice"
          style={frame}
        >
          <rect width="600" height="220" fill={brand.fog} />
          <rect x="40" y="30" width="150" height="70" fill={brand.sunlight} />
          <rect x="230" y="30" width="120" height="70" fill={brand.sunlight} />
          <rect x="390" y="30" width="170" height="70" fill={brand.sunlight} />
          <rect x="40" y="140" width="210" height="60" fill={brand.sunlight} />
          <rect x="290" y="140" width="270" height="60" fill={brand.sunlight} />
          <rect x="0" y="108" width="600" height="24" fill="#FFFFFF" />
          <rect x="196" y="0" width="28" height="220" fill="#FFFFFF" />
          <path
            d="M300 58c-9 0-16 7-16 16 0 12 16 28 16 28s16-16 16-28c0-9-7-16-16-16z"
            fill={brand.purple}
          />
          <circle cx="300" cy="74" r="6" fill={brand.gold} />
        </svg>
      )}
      <CardActions
        sx={{ flexWrap: "wrap", justifyContent: "space-between", gap: 1.5, px: 2, py: 1.5 }}
      >
        <Typography sx={{ fontWeight: 600 }}>{location.name}</Typography>
        <Button
          variant="outlined"
          href={`https://www.google.com/maps/search/?api=1&query=${query}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps
        </Button>
      </CardActions>
    </Card>
  );
}
