"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Shield, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecoveryCodes } from "./RecoveryCodes";

type Step = "idle" | "qr" | "verify" | "recovery" | "done";

interface TwoFactorSetupProps {
  enabled: boolean;
  factorId?: string;
  onChange?: () => void;
}

export function TwoFactorSetup({ enabled, factorId, onChange }: TwoFactorSetupProps) {
  const t = useTranslations("twoFactorSetup");
  const tCommon = useTranslations("common");
  const tMeta = useTranslations("metadata");
  const [step, setStep] = useState<Step>("idle");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [enrolledFactorId, setEnrolledFactorId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showUnenroll, setShowUnenroll] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      issuer: tMeta("brandName"),
    });
    setLoading(false);
    if (error) {
      toast.error(t("enrollError"));
      return;
    }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolledFactorId(data.id);
    setStep("qr");
  };

  const verifyAndActivate = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrolledFactorId,
    });
    if (challengeError) {
      setError(t("verifyError"));
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrolledFactorId,
      challengeId: challenge.id,
      code: code.replace(/\s/g, ""),
    });
    if (verifyError) {
      setError(t("verifyError"));
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/recovery-codes", { method: "POST" });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(t("noRecoveryWarning"));
      setStep("done");
      onChange?.();
      return;
    }
    setRecoveryCodes(json.codes);
    setStep("recovery");
    onChange?.();
  };

  const handleUnenroll = async () => {
    if (!factorId) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setLoading(false);
    setShowUnenroll(false);
    if (error) {
      toast.error(t("unenrollError"));
      return;
    }
    toast.success(t("unenrollSuccess"));
    onChange?.();
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  if (step === "recovery") {
    return (
      <RecoveryCodes
        codes={recoveryCodes}
        onDone={() => {
          setStep("done");
          setRecoveryCodes([]);
        }}
      />
    );
  }

  if (enabled && step === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="gap-1 border-green-200 bg-green-50 text-green-600 dark:bg-green-950/20"
          >
            <CheckCircle2 className="h-3 w-3" />
            {t("activeBadge")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("activeDescription")}</p>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setShowUnenroll(true)}
        >
          {t("deactivate")}
        </Button>

        <Dialog open={showUnenroll} onOpenChange={setShowUnenroll}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("unenrollTitle")}</DialogTitle>
              <DialogDescription>{t("unenrollDescription")}</DialogDescription>
            </DialogHeader>
            <Alert variant="destructive" className="text-sm">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{t("unenrollWarning")}</AlertDescription>
            </Alert>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowUnenroll(false)}>
                {tCommon("cancel")}
              </Button>
              <Button variant="destructive" onClick={handleUnenroll} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("deactivateConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (step === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            {t("inactiveBadge")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("inactiveDescription")}</p>
        <Button onClick={startSetup} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Shield className="mr-2 h-4 w-4" />
          {t("activate")}
        </Button>
      </div>
    );
  }

  if (step === "qr") {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">{t("scanQr")}</p>

        {qrCode && (
          <div className="flex justify-center">
            <div
              className="inline-block rounded-xl border bg-white p-3"
              dangerouslySetInnerHTML={{ __html: qrCode }}
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("orEnterManually")}
          </Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {secret}
            </code>
            <Button size="icon" variant="ghost" onClick={copySecret} aria-label={t("copyKey")}>
              {secretCopied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button className="w-full" onClick={() => setStep("verify")}>
          {t("scannedIt")}
        </Button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("verifyInstruction")}</p>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Input
            id="totp-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            type="text"
            inputMode="numeric"
            placeholder="000 000"
            maxLength={7}
            className="h-12 text-center font-mono text-2xl tracking-[0.5em]"
            autoFocus
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("qr")} className="flex-1">
            {tCommon("back")}
          </Button>
          <Button
            className="flex-1"
            onClick={verifyAndActivate}
            disabled={loading || code.replace(/\s/g, "").length < 6}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                {t("verifying")}
              </>
            ) : (
              t("activateConfirm")
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
