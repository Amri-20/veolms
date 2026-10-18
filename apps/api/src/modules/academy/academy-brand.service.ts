import {
  ACADEMY_LOGO_MAX_BYTES,
  type AcademyBrandResponse,
  type AcademyLogoCompleteRequest,
  type AcademyLogoPresignRequest,
  type AcademyLogoPresignResponse,
  type UpdateAcademyBrandRequest,
} from "@veolms/contracts";
import type { DatabaseExecutor } from "@veolms/database";
import type { S3StorageService } from "@veolms/storage";

import { config } from "../../config.ts";
import { AppError } from "../../lib/errors.ts";
import { detectImageContentType } from "../avatars/avatar-storage.ts";
import * as repository from "./academy-brand.repository.ts";
import {
  academyLogoKey,
  academyLogoUrl,
  isDrawableLogo,
  readLogo,
} from "./academy-logo.ts";

/**
 * How long a read of the academy's name and logo is kept. Every code email
 * needs them, so they are not read from the database for each one; a save
 * here clears the copy at once, and another API instance picks the change
 * up within this time.
 */
const BRAND_CACHE_MS = 60_000;

let cached: { brand: AcademyBrandResponse; at: number } | null = null;

/** Used before the academy has a row (an install not yet through setup). */
function fallbackBrand(): AcademyBrandResponse {
  return { name: config.ACADEMY_NAME, logoUrl: null };
}

export function createAcademyBrandService({
  database,
  storage,
}: {
  database: DatabaseExecutor;
  /** Needed only to upload or remove the logo. */
  storage?: S3StorageService;
}) {
  async function readBrand(): Promise<AcademyBrandResponse> {
    const row = await repository.findAcademyBrand(database);
    return row
      ? { name: row.name.trim() || config.ACADEMY_NAME, logoUrl: row.logo_url }
      : fallbackBrand();
  }

  /** For the emails: the brand, from the short-lived copy when it is fresh. */
  async function getBrand(): Promise<AcademyBrandResponse> {
    if (cached && Date.now() - cached.at < BRAND_CACHE_MS) return cached.brand;
    try {
      const brand = await readBrand();
      cached = { brand, at: Date.now() };
      return brand;
    } catch {
      // A code email must still go out when this read fails.
      return cached?.brand ?? fallbackBrand();
    }
  }

  async function requireAcademy() {
    const row = await repository.findAcademyBrand(database);
    if (!row) {
      throw new AppError(
        409,
        "ACADEMY_NOT_SET_UP",
        "The academy has not been set up yet.",
      );
    }
    return row;
  }

  async function saveBrand(
    id: string,
    brand: AcademyBrandResponse,
  ): Promise<AcademyBrandResponse> {
    await repository.updateAcademyBrand(database, { id, ...brand });
    cached = { brand, at: Date.now() };
    return brand;
  }

  /** Renames the academy; the logo stays as it is. */
  async function updateBrand(
    input: UpdateAcademyBrandRequest,
  ): Promise<AcademyBrandResponse> {
    const row = await requireAcademy();
    return await saveBrand(row.id, {
      name: input.name.trim(),
      logoUrl: row.logo_url,
    });
  }

  function requireStorage(): S3StorageService {
    if (!storage) {
      throw new AppError(
        500,
        "CONFIG_ERROR",
        "Storage is required to upload the academy logo.",
      );
    }
    return storage;
  }

  /** An address the browser uploads the new logo to, directly. */
  async function presignLogo(
    input: AcademyLogoPresignRequest,
  ): Promise<AcademyLogoPresignResponse> {
    await requireAcademy();
    const uploadId = crypto.randomUUID();
    const uploadUrl = await requireStorage().getPresignedPutUrl(
      academyLogoKey(uploadId, input.contentType),
      input.contentType,
      input.fileSize,
      undefined,
      // The logo is public: the type is bound, so the upload cannot be
      // stored as anything else.
      { bindContentType: true },
    );
    return { uploadId, uploadUrl };
  }

  /**
   * Checks the uploaded file is the image it claims to be, then makes it the
   * academy's logo. The logo it replaces is kept in storage: emails already
   * sent still show it.
   */
  async function completeLogo(
    input: AcademyLogoCompleteRequest,
  ): Promise<AcademyBrandResponse> {
    const row = await requireAcademy();
    const store = requireStorage();
    const key = academyLogoKey(input.uploadId, input.contentType);
    const reject = async (message: string): Promise<never> => {
      await store.deleteObject(key).catch(() => undefined);
      throw new AppError(400, "INVALID_LOGO_UPLOAD", message);
    };

    const head = await store.headObject(key);
    if (!head) {
      throw new AppError(
        400,
        "INVALID_LOGO_UPLOAD",
        "The logo was not uploaded. Try again.",
      );
    }
    if ((head.contentLength ?? 0) > ACADEMY_LOGO_MAX_BYTES) {
      return await reject("The logo must be 2 MB or smaller.");
    }
    const image = await readLogo(store, key, ACADEMY_LOGO_MAX_BYTES);
    if (!image) {
      return await reject("The logo must be 2 MB or smaller.");
    }
    if (detectImageContentType(image) !== input.contentType) {
      return await reject("The logo must be a PNG or JPEG image.");
    }
    // Invoices draw the logo into a PDF; an image they cannot draw is
    // refused here rather than found out on every invoice.
    if (!isDrawableLogo(image)) {
      return await reject(
        "This image could not be read. Save it again as a standard (non-interlaced) PNG or a JPEG, and upload that.",
      );
    }

    const logoUrl = academyLogoUrl(store, key, config.WEB_URL);
    if (!logoUrl) {
      return await reject("Logos cannot be stored: no public address is set.");
    }
    return await saveBrand(row.id, { name: row.name, logoUrl });
  }

  /**
   * The academy goes back to showing its name where the logo was. The file
   * stays in storage, for the emails already sent with it.
   */
  async function removeLogo(): Promise<AcademyBrandResponse> {
    const row = await requireAcademy();
    return await saveBrand(row.id, { name: row.name, logoUrl: null });
  }

  return {
    getBrand,
    readBrand,
    updateBrand,
    presignLogo,
    completeLogo,
    removeLogo,
  };
}

export type AcademyBrandService = ReturnType<typeof createAcademyBrandService>;
