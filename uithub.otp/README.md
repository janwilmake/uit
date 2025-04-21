# uithub.otp

## **Create OTP**: `POST /otp`

**Request Body**:

```json
{
  "url": "https://github.com/user/repo/archive/main.zip",
  "allowedServices": ["uithub.ingestzip", "uithub.ziptree"],
  "expiresIn": 3600
}
```

**Request Headers**:

- `Authorization`: Original auth token to be protected

**Response**:

```json
{
  "otp": "abc123xyz789",
  "expires": "2025-04-21T15:30:00Z"
}
```

## **Use OTP**: `GET /otp/{otp}`

**Request Headers**:

- `X-Service-ID`: Identifier of the requesting service (e.g., "uithub.ingestzip")

**Response**: Streamed content from the original URL with the original Authorization header
