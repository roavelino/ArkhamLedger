declare module '@supabase/supabase-js' {
  export interface Session {
    user: User;
  }

  export interface User {
    id: string;
    email?: string;
  }

  export type AuthChangeEvent = string;

  export interface SupabaseClient<Database = unknown> {
    auth: {
      signInWithPassword(params: { email: string; password: string }): Promise<{ data: { session: Session | null }; error: { message: string } | null }>;
      signOut(): Promise<{ error: { message: string } | null }>;
      getSession(): Promise<{ data: { session: Session | null }; error: { message: string } | null }>;
      onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): {
        data: { subscription: { unsubscribe(): void } };
      };
    };
    from(table: string): any;
    storage: {
      from(bucket: string): {
        upload(path: string, file: File, options?: { upsert?: boolean; cacheControl?: string }): Promise<{ error: { message: string } | null }>;
        getPublicUrl(path: string): { data: { publicUrl: string } };
      };
    };
  }

  export function createClient<Database = unknown>(url: string, key: string, options?: unknown): SupabaseClient<Database>;
}
