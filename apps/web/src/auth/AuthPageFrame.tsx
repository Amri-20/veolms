import type { ReactNode } from "react";
import { productName } from "../routing/routeDescriptors";

export function AuthPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-page__container">
        <div className="auth-page__form-column">{children}</div>
      </div>

      <p className="auth-page__footer">
        <span>&copy; 2026 {productName}. All rights reserved.</span>
      </p>
    </div>
  );
}
