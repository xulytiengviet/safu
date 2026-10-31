# Evidence-backed geographic locations

This dataset is deliberately empty at initialization.

**Do not geocode blockchain addresses, transaction hashes, chain brands, or speculative threat actor countries.** Wallets are identifiers on a distributed ledger, not physical locations.

Add a GeoJSON Point only if a trustworthy and specific public source provides a *real geographic location related to the incident*, with:
- `name`: neutral label of place;
- `location_type`: e.g. regulator_office, confirmed_in_person_event, data_center;
- `observed_at`: ISO UTC timestamp;
- `source_url`: immutable report / official notice;
- `confidence`: verified or reported;
- `description`: explains exactly what location signifies;
- `coordinates`: longitude and latitude in WGS84 (EPSG:4326).

The GIS layer should never portray office coordinates as cryptocurrency movement. Geocoding arbitrary wallet or server IP locations does not prove an attacker's physical location.
