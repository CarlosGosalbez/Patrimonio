declare module 'jsr:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare module 'npm:resend@4.6.0' {
  export class Resend {
    constructor(apiKey: string)
    emails: {
      send(input: {
        from: string
        html: string
        subject: string
        to: string | string[]
      }): Promise<unknown>
    }
  }
}

declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}
