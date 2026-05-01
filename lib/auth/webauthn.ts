export interface WebAuthnCredential {
  credentialId: string;
  name: string;
  createdAt: string;
}

export async function isWebAuthnAvailable(): Promise<boolean> {
  return (
    typeof window !== "undefined" &&
    window.PublicKeyCredential !== undefined &&
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== undefined
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!(await isWebAuthnAvailable())) return false;

  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerCredential(
  userId: string,
  username: string,
): Promise<{ credentialId: string; publicKey: string } | null> {
  if (!(await isPlatformAuthenticatorAvailable())) return null;

  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: "Patrimonio",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;

  if (!credential) return null;

  const response = credential.response as AuthenticatorAttestationResponse;
  const credentialId = arrayBufferToBase64(credential.rawId);
  const publicKey = arrayBufferToBase64(response.getPublicKey()!);

  return { credentialId, publicKey };
}

export async function authenticateWithCredential(credentialId: string): Promise<boolean> {
  if (!(await isPlatformAuthenticatorAvailable())) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            type: "public-key",
            id: base64ToArrayBuffer(credentialId),
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return assertion !== null;
  } catch {
    return false;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
