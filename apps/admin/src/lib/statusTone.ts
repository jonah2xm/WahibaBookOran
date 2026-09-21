export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "remitted"
  | "returned"
  | "cancelled";

/** The pipeline columns A7 shows, in the order work moves through them. */
export const PIPELINE: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "remitted",
  "returned",
];

/** Board §02 status colours. Never colour alone — each pill carries a label. */
export const STATUS_TONE: Record<OrderStatus, string> = {
  pending: "bg-warning/12 text-warning",
  confirmed: "bg-info/12 text-info",
  packed: "bg-info/12 text-info",
  shipped: "bg-rose-50 text-rose",
  delivered: "bg-success/12 text-success",
  remitted: "bg-success text-white",
  returned: "bg-danger/12 text-danger",
  cancelled: "bg-danger/12 text-danger",
};
