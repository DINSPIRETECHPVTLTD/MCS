# MCS App - Ionic Web + Mobile Application

A cross-platform application built with Ionic and Angular that works on both web and mobile devices.

## Features

- **Login Page**: Secure authentication using the MCS API
- **Cross-Platform**: Works on web browsers, iOS, and Android
- **Modern UI**: Built with Ionic components for a native-like experience

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Ionic CLI: `npm install -g @ionic/cli`
- Angular CLI: `npm install -g @angular/cli`

## Installation

1. Install dependencies:
```bash
npm install
```

## Development

### Web Development

Run the app in the browser:
```bash
npm start
# or
ionic serve
```

The app will be available at `http://localhost:4200`

### Mobile Development

#### Android

1. Add Android platform:
```bash
ionic cap add android
```

2. Sync the project:
```bash
ionic cap sync
```

3. Open in Android Studio:
```bash
ionic cap open android
```

#### iOS

1. Add iOS platform:
```bash
ionic cap add ios
```

2. Sync the project:
```bash
ionic cap sync
```

3. Open in Xcode:
```bash
ionic cap open ios
```

## API Configuration

The app is configured to connect to the API at:
- **Base URL**: `https://localhost:7091/api`
- **Login Endpoint**: `POST /api/Auth/login`

To change the API URL, edit `src/environments/environment.ts` and `src/environments/environment.prod.ts`.

## Project Structure

```
src/
├── app/
│   ├── pages/
│   │   └── login/          # Login page component
│   ├── services/
│   │   └── auth.service.ts # Authentication service
│   ├── app.component.ts    # Root component
│   ├── app.module.ts       # Root module
│   └── app-routing.module.ts
├── environments/           # Environment configuration
├── theme/                  # Global styles
└── assets/                 # Static assets
```

## Login API

The login endpoint expects a POST request to `/api/Auth/login` with the following body:

```json
{
  "username": "your-username",
  "password": "your-password"
}
```

The response should include a token (either `token` or `accessToken` field) which will be stored in localStorage.

## Building for Production

### Web
```bash
npm run build
```

### Mobile
```bash
ionic build
ionic cap sync
```

## Troubleshooting

### CORS Issues
If you encounter CORS errors when connecting to `https://localhost:7091`, you may need to:
1. Configure your API server to allow requests from your app's origin
2. Use a proxy configuration in Angular (see `angular.json` proxy settings)

### SSL Certificate Issues
For localhost HTTPS connections, you may need to accept the self-signed certificate in your browser or configure the API to use a trusted certificate.

## License

MIT

