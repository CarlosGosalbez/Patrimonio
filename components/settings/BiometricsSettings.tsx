"use client";

import { useEffect, useState } from "react";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  isPlatformAuthenticatorAvailable,
  registerCredential,
  type WebAuthnCredential,
} from "@/lib/auth/webauthn";

export function BiometricsSettings() {
  const t = useTranslations("settings.security");
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([]);

  useEffect(() => {
    async function checkAvailability() {
      const isAvailable = await isPlatformAuthenticatorAvailable();
      setAvailable(isAvailable);

      if (isAvailable) {
        const stored = localStorage.getItem("webauthn_credentials");
        if (stored) {
          const creds = JSON.parse(stored) as WebAuthnCredential[];
          setCredentials(creds);
          setEnabled(creds.length > 0);
        }
      }

      setLoading(false);
    }

    void checkAvailability();
  }, []);

  async function handleEnroll() {
    setLoading(true);
    try {
      const userId = crypto.randomUUID();
      const username = "user@patrimio.app";

      const result = await registerCredential(userId, username);

      if (!result) {
        toast.error(t("biometrics.enrollFailed"));
        return;
      }

      const newCredential: WebAuthnCredential = {
        credentialId: result.credentialId,
        name: t("biometrics.deviceName", {
          type: getBiometricType(),
          date: new Date().toLocaleDateString("es-ES"),
        }),
        createdAt: new Date().toISOString(),
      };

      const updated = [...credentials, newCredential];
      setCredentials(updated);
      setEnabled(true);
      localStorage.setItem("webauthn_credentials", JSON.stringify(updated));

      toast.success(t("biometrics.enrollSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("biometrics.enrollFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setCredentials([]);
    setEnabled(false);
    localStorage.removeItem("webauthn_credentials");
    toast.success(t("biometrics.disabled"));
  }

  function getBiometricType(): string {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return "Face ID / Touch ID";
    if (/Android/.test(ua)) return "Fingerprint / Face Unlock";
    if (/Windows/.test(ua)) return "Windows Hello";
    if (/Mac/.test(ua)) return "Touch ID";
    return "Biometric";
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            {t("biometrics.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-10 w-full rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!available) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldCheck className="h-5 w-5" />
            {t("biometrics.notAvailable")}
          </CardTitle>
          <CardDescription>{t("biometrics.notAvailableDesc")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          {t("biometrics.title")}
        </CardTitle>
        <CardDescription>
          {t("biometrics.description", { type: getBiometricType() })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div className="space-y-1">
            <Label htmlFor="biometric-toggle" className="text-base font-medium">
              {t("biometrics.enableLabel")}
            </Label>
            <p className="text-sm text-muted-foreground">{t("biometrics.enableDesc")}</p>
          </div>
          <Switch
            id="biometric-toggle"
            checked={enabled}
            onCheckedChange={(checked) => {
              if (checked) {
                void handleEnroll();
              } else {
                void handleDisable();
              }
            }}
            disabled={loading}
          />
        </div>

        {enabled && credentials.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">{t("biometrics.registeredDevices")}</h4>
            {credentials.map((cred) => (
              <div
                key={cred.credentialId}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium">{cred.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("biometrics.registeredOn", {
                      date: new Date(cred.createdAt).toLocaleDateString(),
                    })}
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
            ))}
          </div>
        )}

        {enabled && (
          <Button variant="outline" onClick={handleEnroll} disabled={loading} className="w-full">
            <Fingerprint className="mr-2 h-4 w-4" />
            {t("biometrics.addDevice")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
