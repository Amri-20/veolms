import { CircleNotchIcon as CircleNotch } from "@phosphor-icons/react/CircleNotch";
import type { AcademyBrandResponse } from "@veolms/contracts";
import { useState, type FormEvent } from "react";
import { Button } from "../components/Button";
import { getApiError } from "../lib/api-error";
import { useAcademyBrand, useUpdateAcademyBrand } from "../services/academy";
import { SettingsSection, TextField } from "./homePageSettingsControls";

/**
 * The academy's name and logo: what its emails (the sign-in code, account
 * notices) show at the top. Saved on its own, apart from the home page's
 * settings below it.
 */
export function AcademyBrandSection({
  setNotice,
}: {
  setNotice?: (message: string) => void;
}) {
  const brandQuery = useAcademyBrand();

  return (
    <SettingsSection
      id="academy-brand-heading"
      title="Academy name and logo"
      description="Shown at the top of the emails your academy sends, such as sign-in codes."
    >
      {brandQuery.isLoading ? (
        <p className="text-sm text-(--muted)">Loading…</p>
      ) : brandQuery.isError || !brandQuery.data ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-(--muted)">
            The academy&apos;s name and logo could not be loaded.
          </p>
          <Button onClick={() => void brandQuery.refetch()}>Try again</Button>
        </div>
      ) : (
        <AcademyBrandForm
          // A save replaces the saved copy; start the draft from it again.
          key={`${brandQuery.data.name}\n${brandQuery.data.logoUrl ?? ""}`}
          saved={brandQuery.data}
          setNotice={setNotice}
        />
      )}
    </SettingsSection>
  );
}

function logoAddressProblem(value: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).protocol === "https:"
      ? null
      : "Use an https:// address. Mail apps do not show logos from http.";
  } catch {
    return "Enter a full address, starting with https://";
  }
}

function AcademyBrandForm({
  saved,
  setNotice,
}: {
  saved: AcademyBrandResponse;
  setNotice?: (message: string) => void;
}) {
  const [name, setName] = useState(saved.name);
  const [logoUrl, setLogoUrl] = useState(saved.logoUrl ?? "");
  const [logoFailed, setLogoFailed] = useState(false);
  const updateBrand = useUpdateAcademyBrand();

  const trimmedLogo = logoUrl.trim();
  const isDirty =
    name.trim() !== saved.name || trimmedLogo !== (saved.logoUrl ?? "");
  const problem = !name.trim()
    ? "Enter the academy's name."
    : logoAddressProblem(trimmedLogo);
  const saveError = updateBrand.isError
    ? getApiError(updateBrand.error).message
    : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (problem || !isDirty || updateBrand.isPending) return;
    updateBrand.mutate(
      { name: name.trim(), logoUrl: trimmedLogo || null },
      { onSuccess: () => setNotice?.("Academy name and logo saved.") },
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="academy-brand-name"
          label="Academy name"
          value={name}
          onChange={(value) => {
            updateBrand.reset();
            setName(value);
          }}
          maxLength={255}
          required
          hint="Used in email subjects and wherever the logo cannot load."
        />
        <TextField
          id="academy-brand-logo"
          label="Logo address"
          value={logoUrl}
          onChange={(value) => {
            updateBrand.reset();
            setLogoFailed(false);
            setLogoUrl(value);
          }}
          maxLength={2000}
          placeholder="https://…/logo.png"
          hint="A public https:// link to a PNG with a transparent background, about 64px tall. Leave empty to show the name instead."
        />
      </div>

      {/* How the top of an email will look: the emails' navy, with the logo
          or, without one, the name in the wordmark's style. */}
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-(--text)">
          Email preview
        </p>
        <div className="flex min-h-18 items-center rounded-xl bg-[#0B0D12] px-6 py-5">
          {trimmedLogo && !logoAddressProblem(trimmedLogo) && !logoFailed ? (
            <img
              alt={name.trim() || "Academy logo"}
              className="block h-8 w-auto max-w-60"
              onError={() => setLogoFailed(true)}
              src={trimmedLogo}
            />
          ) : (
            <span className="text-2xl leading-8 font-bold tracking-[-0.5px] text-[#F3F4F6]">
              <span className="text-[#6E7CFF]">{name.trim().charAt(0)}</span>
              {name.trim().slice(1)}
            </span>
          )}
        </div>
        {logoFailed ? (
          <p className="mt-1.5 text-xs text-rose-500">
            This logo could not be loaded. Check that the address is public.
          </p>
        ) : null}
      </div>

      {problem && isDirty ? (
        <p className="text-xs text-rose-500" role="alert">
          {problem}
        </p>
      ) : null}
      {saveError ? (
        <p className="text-xs text-rose-500" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        {isDirty ? (
          <button
            type="button"
            className="h-10 cursor-pointer rounded-xl px-3.5 text-sm font-semibold text-(--muted) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-(--accent)"
            onClick={() => {
              updateBrand.reset();
              setLogoFailed(false);
              setName(saved.name);
              setLogoUrl(saved.logoUrl ?? "");
            }}
          >
            Discard
          </button>
        ) : null}
        <Button
          type="submit"
          motion="static"
          disabled={!isDirty || Boolean(problem) || updateBrand.isPending}
        >
          {updateBrand.isPending ? (
            <CircleNotch size={16} className="animate-spin" />
          ) : null}
          Save name and logo
        </Button>
      </div>
    </form>
  );
}
