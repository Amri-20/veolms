import type {
  AcademyBrandResponse,
  UpdateAcademyBrandRequest,
} from "@veolms/contracts";
import { api } from "../../lib/api-client";

export const academyService = {
  getBrand(): Promise<AcademyBrandResponse> {
    return api.get<AcademyBrandResponse>("/academy/brand");
  },
  updateBrand(brand: UpdateAcademyBrandRequest): Promise<AcademyBrandResponse> {
    return api.put<AcademyBrandResponse>("/academy/brand", brand);
  },
};
