import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key || !url.startsWith('http')) {
    console.warn("Supabase credentials missing. App will run in Test Mode.")
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ error: null }),
        delete: () => ({
          eq: () => ({
            eq: async () => ({ error: null })
          })
        })
      })
    } as any
  }

  return createBrowserClient(url, key)
}
