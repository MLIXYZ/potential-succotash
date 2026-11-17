// Backend contract (backend/app/main.py):
//   POST /api/chat  { message }  ->  { answer, sources: [{ title, url }] }
// `location` is optional and not sent by the backend yet; MapCard renders only
// when it is present, so adding it server-side later needs no frontend change.

export interface Source {
  title: string;
  url: string;
}

export interface MapLocation {
  name: string;
  mapQuery?: string;
}

export interface ChatResponse {
  answer: string;
  sources?: Source[];
  location?: MapLocation;
}

export type ChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; sources?: Source[]; location?: MapLocation };
