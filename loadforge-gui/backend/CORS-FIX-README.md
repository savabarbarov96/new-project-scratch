# CORS Fix for LoadForge Backend

## Problem
The frontend (running on `localhost:5173`) was unable to connect to the backend (running on `127.0.0.1:3001`) due to a CORS error: "The 'Access-Control-Allow-Origin' header contains multiple values".

## Root Cause
The original CORS configuration was passing an array of origins directly to the Fastify CORS plugin, which can cause multiple values to be set in the `Access-Control-Allow-Origin` header incorrectly.

## Solution
Updated the CORS configuration to use a function-based approach that properly handles multiple origins:

### Changes Made

1. **Updated `src/index.ts`**:
   - Replaced the simple array-based origin configuration with a function that dynamically determines allowed origins
   - Added proper logging for debugging CORS requests
   - Added comprehensive CORS options including methods, headers, and preflight handling

2. **Key Features of the New Configuration**:
   - ✅ Supports multiple origins properly
   - ✅ Allows requests with no origin (for tools like curl)
   - ✅ Includes development-friendly fallback for any localhost/127.0.0.1 origin
   - ✅ Proper preflight request handling
   - ✅ Comprehensive logging for debugging

## Testing the Fix

### 1. Start the Backend
```bash
cd loadforge-gui/backend
npm run dev
```

### 2. Test CORS with the Test Script
```bash
node test-cors.js
```

This will test CORS from all the expected origins and show you the headers being returned.

### 3. Check the Logs
Look at the backend console output to see CORS request logging like:
```
INFO: CORS request from origin: http://localhost:5173
INFO: Allowing origin: http://localhost:5173
```

### 4. Test with Your Frontend
Start your frontend and try to connect. The connection should now work without CORS errors.

## Allowed Origins
The following origins are explicitly allowed:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

In development mode, any localhost or 127.0.0.1 origin will be allowed as a fallback.

## Troubleshooting

If you still see CORS issues:

1. **Check the backend logs** - Look for CORS-related log messages
2. **Verify the origin** - Make sure your frontend is running on one of the allowed origins
3. **Clear browser cache** - Sometimes browsers cache CORS preflight responses
4. **Check for multiple CORS middleware** - Ensure no other CORS configuration is conflicting

## Technical Details

The fix uses the Fastify CORS plugin's function-based origin configuration, which is the recommended approach for handling multiple origins. This ensures that only one `Access-Control-Allow-Origin` header is set per response, matching the requesting origin. 