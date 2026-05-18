# Google OAuth Integration Plan

## Current Status
- Frontend: Has @react-oauth/google library
- Backend: Has custom Google credential verification
- Supabase: Has google-auth edge function
- UI: Login page already shows Google button + Phone OTP option

## User's Question
"Supabase has built-in OAuth - what should I do next?"

## Two Implementation Paths

### Path 1: Optimize Current Custom Implementation
- Keep current @react-oauth/google approach
- Ensure all environment variables are set
- Make sure Supabase edge functions are deployed
- Test end-to-end flow

### Path 2: Use Supabase's Built-In OAuth
- Enable Google OAuth provider in Supabase Dashboard
- Replace @react-oauth/google with supabase.auth.signInWithOAuth()
- Simpler - Supabase handles everything

## Action Items
1. Check if GOOGLE_CLIENT_ID is set in both frontend .env and Supabase secrets
2. Verify backend can reach Supabase for user upsert
3. Test the complete flow
4. Deploy to production if working
