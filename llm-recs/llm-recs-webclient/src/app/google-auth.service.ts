import { Injectable, NgZone, Signal, WritableSignal, computed, signal } from '@angular/core';
import * as jose from 'jose'

interface LoginJWT {
  credential: string;
}

interface Credential {
  aud: string, // Your server's client ID
  email: string;  // The user's email address
  email_verified: boolean;  // true, if Google has verified the email address
  iat: number; // Unix timestamp of the assertion's creation time
  exp: number; // Unix timestamp of the assertion's expiration time
  family_name: string;
  given_name: string;
  name: string;  // full name
  hd: string; // If present, the host domain of the user's GSuite email address
  iss: string; // The JWT's issuer
  jti: "6477b4ea3ea82bb089ae4f70e841a94dd2fc2a69"
  locale: string; // e.g. "en-GB"
  nbf: 1699142933
  picture: string;   // If present, a URL to user's profile picture
  sub: string;  // The unique ID of the user's Google Account
}

// function base64ToBytes(base64str: string): Uint8Array {
//   const binString = Buffer.from(base64str, 'base64');
//   return Uint8Array.from(binString, (m) => m.codePointAt(0));
// }

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  public jwtCredential: WritableSignal<string | null>;
  public credential: Signal<Credential | null>;

  constructor(private ngZone: NgZone) {
    this.jwtCredential = signal(null);
    this.credential = computed(() => {
      const jwt = this.jwtCredential();
      console.log('Got credentials', jwt);
      if (!jwt) { return null; }
      console.log(jose.decodeJwt(jwt));
      return jose.decodeJwt(jwt);
    });

    // @ts-ignore
    google.accounts.id.initialize({
      client_id: '296942359052-nak57g1koo8fctnjdj9vbq0blu4p8eqg.apps.googleusercontent.com',
      callback: (loginState: LoginJWT) => {
        this.ngZone.run(() => {
          this.jwtCredential.set(loginState.credential);
        });
      },
      auto_select: true,
    });
  }

  prompt() {
    // @ts-ignore
    google.accounts.id.prompt();
  }
}
