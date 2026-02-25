
export interface BirthDetails {
  name: string;
  dob: string;
  tob: string;
  pob: string;
  gender: 'male' | 'female' | 'other';
}

export interface PlanetPosition {
  planet: string;
  sign: string;
  degree: string;
  house: number;
  nakshatra?: string;
  status?: string;
}

export interface DashaPeriod {
  planet: string;
  start: string;
  end: string;
  isActive: boolean;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface ChatMessage extends Message {
  id: string;
  timestamp: string;
  status: 'sent' | 'read';
}

export interface PastConsultation {
  id: string;
  date: string;
  title: string;
  messages: ChatMessage[];
}

export interface User {
  id: string;
  name: string;
  birthDetails: BirthDetails;
  kundaliData: any[];
  planetaryPositions: PlanetPosition[];
  dashas: DashaPeriod[];
}

export interface MatchmakingState {
  partnerA: BirthDetails;
  partnerB: BirthDetails | null;
  result?: string;
}

export interface PanchangData {
  tithi: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  weekday: string;
  rahuKaal: string;
  abhijit: string;
}
