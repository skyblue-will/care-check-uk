export interface CareHome {
  locationId: string;
  name: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  address: string;
  townCity: string;
  region: string;
  localAuthority: string;
  careHome: string;
  numberOfBeds: number | null;
  website: string | null;
  phone: string | null;
  brandName: string | null;
  providerName: string | null;
  providerId: string;
  serviceTypes: string[];
  specialisms: string[];
  overallRating: string | null;
  safeRating: string | null;
  effectiveRating: string | null;
  caringRating: string | null;
  responsiveRating: string | null;
  wellLedRating: string | null;
  lastInspectionDate: string | null;
  reportDate: string | null;
  reportLinkId: string | null;
  registrationDate: string | null;
}

export interface SearchResult extends CareHome {
  distance: number; // miles
}

export interface PostcodeResult {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district: string;
  region: string;
}
