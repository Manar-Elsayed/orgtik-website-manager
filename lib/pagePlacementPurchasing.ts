import type { PagePlacementMap } from "./pagePlacementTypes";

/** Purchasing pages store their visible copy in one shared, canonical component. */
export const PURCHASING_PLACEMENTS: PagePlacementMap = {
  pg_plans: {
    "shared-copy": {
      title: "purchasePagesPlansTitle",
      where: "purchasePagesPlansWhere",
    },
  },
  pg_cart: {
    "shared-copy": {
      title: "purchasePagesCartTitle",
      where: "purchasePagesCartWhere",
    },
  },
  pg_checkout: {
    "shared-copy": {
      title: "purchasePagesCheckoutTitle",
      where: "purchasePagesCheckoutWhere",
    },
  },
};

export const PURCHASING_COPY: Record<string, string> = {
  purchasePagesPlansTitle: "Plans and shared purchasing text",
  purchasePagesPlansWhere:
    "Open Plans for the package directory. Choose a section below to find its exact website location. Shared builder controls also appear on Services and Software; their preview buttons open those screens.",
  purchasePagesCartTitle: "Cart and shared purchase dialogs",
  purchasePagesCartWhere:
    "Open Cart. The introduction and empty state appear before adding a plan; plan controls require items in Cart. Choose a section below for its location and the action that reveals a dialog or message.",
  purchasePagesCheckoutTitle: "Checkout and payment confirmation",
  purchasePagesCheckoutWhere:
    "Checkout requires a valid Cart. Billing and payment fields appear before payment; confirmation and receipt text appear after a successful test payment. Choose a section below for its exact location and required state.",
};
