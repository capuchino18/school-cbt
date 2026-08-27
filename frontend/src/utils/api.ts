// Base URL untuk backend API (Railway).
// Di Vercel, atur NEXT_PUBLIC_API_URL pada Project Settings > Environment Variables
// agar frontend tidak mencoba mengakses localhost saat production.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
