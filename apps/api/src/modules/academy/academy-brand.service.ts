import type {
  AcademyBrandResponse,
  UpdateAcademyBrandRequest,
} from "@veolms/contracts";
import type { DatabaseExecutor } from "@veolms/database";

import { config } from "../../config.ts";
import { AppError } from "../../lib/errors.ts";
import * as repository from "./academy-brand.repository.ts";

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
}: {
  database: DatabaseExecutor;
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

  async function updateBrand(
    input: UpdateAcademyBrandRequest,
  ): Promise<AcademyBrandResponse> {
    const row = await repository.findAcademyBrand(database);
    if (!row) {
      throw new AppError(
        409,
        "ACADEMY_NOT_SET_UP",
        "The academy has not been set up yet.",
      );
    }
    const brand = { name: input.name.trim(), logoUrl: input.logoUrl ?? null };
    await repository.updateAcademyBrand(database, { id: row.id, ...brand });
    cached = { brand, at: Date.now() };
    return brand;
  }

  return { getBrand, readBrand, updateBrand };
}

export type AcademyBrandService = ReturnType<typeof createAcademyBrandService>;
