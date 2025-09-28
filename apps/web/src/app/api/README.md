# API Routing Conventions

- `/api/v1/*` contains the current production-ready endpoints for the MVP release.
- `/api/v2/*` is reserved for future versions. Add new routes here when breaking changes or new payload formats are required.

When adding a new version, keep the existing version intact to avoid breaking existing clients.
